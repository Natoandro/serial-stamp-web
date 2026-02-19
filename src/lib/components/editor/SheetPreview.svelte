<script lang="ts" module>
	import { getCacheStats } from '$lib/services/wasmPreview';

	function ticketCacheEmpty(): boolean {
		return getCacheStats().ticketsCached === 0;
	}
</script>

<script lang="ts">
	import {
		prepareTickets,
		composeSheet,
		computeSheetGeometry,
		clearTemplateCache,
		type Viewport,
		type SheetGeometry
	} from '$lib/services/wasmPreview';
	import type { Project, SheetLayout } from '$lib/types';

	interface Props {
		project: Project;
		layout: SheetLayout;
	}

	let { project, layout }: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let containerRef = $state<HTMLDivElement | null>(null);
	let isPreparing = $state(false);
	let error = $state<string | null>(null);
	let hasFitted = $state(false);

	// Viewport state (canvas pixels)
	let zoom = $state(1); // canvas-pixels-per-mm
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let lastMouseX = 0;
	let lastMouseY = 0;

	// Container size tracked by ResizeObserver
	let containerWidth = $state(0);
	let containerHeight = $state(0);

	const MIN_ZOOM = 0.5; // px/mm
	const MAX_ZOOM = 50; // px/mm
	const ZOOM_FACTOR = 1.1;

	// Cached geometry (recomputed on layout change)
	let geometry = $derived<SheetGeometry>(computeSheetGeometry(project, layout));

	// Track template changes to clear cache
	let previousTemplate = $state<Blob | null>(null);
	$effect(() => {
		if (project.templateImage !== previousTemplate) {
			clearTemplateCache();
			previousTemplate = project.templateImage;
		}
	});

	// Prepare tickets (async WASM rendering) when project config changes
	let prepareGeneration = 0;
	$effect(() => {
		// Track dependencies that require re-rendering tickets
		void project.stamps;
		void project.templateImage;
		void project.dataSources;

		if (!project.templateImage) {
			error = null;
			isPreparing = false;
			return;
		}

		const gen = ++prepareGeneration;
		isPreparing = true;
		error = null;

		prepareTickets(project)
			.then(() => {
				if (gen !== prepareGeneration) return; // stale
				isPreparing = false;
				if (!hasFitted) {
					fitToScreen();
					hasFitted = true;
				}
				requestCompose();
			})
			.catch((err) => {
				if (gen !== prepareGeneration) return;
				isPreparing = false;
				console.error('Failed to prepare tickets:', err);
				error = err instanceof Error ? err.message : 'Failed to render tickets';
			});
	});

	// Recompose when layout or viewport changes (synchronous, fast)
	$effect(() => {
		// Track layout + viewport dependencies
		void layout;
		void zoom;
		void panX;
		void panY;
		void containerWidth;
		void containerHeight;
		void geometry;

		requestCompose();
	});

	// requestAnimationFrame dedup
	let composeRafId: number | null = null;

	function requestCompose() {
		if (composeRafId !== null) return;
		composeRafId = requestAnimationFrame(doCompose);
	}

	function doCompose() {
		composeRafId = null;
		if (!canvas || containerWidth === 0 || containerHeight === 0) return;

		// Resize canvas to match container (CSS pixels → device pixels for sharpness)
		const dpr = window.devicePixelRatio || 1;
		const cw = Math.round(containerWidth * dpr);
		const ch = Math.round(containerHeight * dpr);

		if (canvas.width !== cw || canvas.height !== ch) {
			canvas.width = cw;
			canvas.height = ch;
		}

		const ctx = canvas.getContext('2d', { alpha: false });
		if (!ctx) return;

		// Scale context for device pixel ratio
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const viewport: Viewport = {
			zoom,
			panX,
			panY,
			cssWidth: containerWidth,
			cssHeight: containerHeight
		};

		try {
			composeSheet(canvas, geometry, viewport, project).catch((err) => {
				console.error('Compose error:', err);
			});
		} catch (err) {
			console.error('Compose error:', err);
		}
	}

	// --- ResizeObserver ---
	$effect(() => {
		if (!containerRef) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				containerWidth = entry.contentRect.width;
				containerHeight = entry.contentRect.height;
			}
		});
		observer.observe(containerRef);

		return () => observer.disconnect();
	});

	// --- Zoom (mouse wheel) ---
	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		if (!containerRef) return;

		const rect = containerRef.getBoundingClientRect();
		// Mouse position relative to container (CSS pixels)
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		// Paper point under cursor (in mm)
		const paperX = (mx - panX) / zoom;
		const paperY = (my - panY) / zoom;

		// New zoom
		const direction = e.deltaY < 0 ? 1 : -1;
		const newZoom = clampZoom(zoom * Math.pow(ZOOM_FACTOR, direction));

		// Adjust pan so the paper point stays under cursor
		panX = mx - paperX * newZoom;
		panY = my - paperY * newZoom;
		zoom = newZoom;
	}

	// --- Pan (mouse drag) ---
	function handleMouseDown(e: MouseEvent) {
		if (e.button === 0) {
			isPanning = true;
			lastMouseX = e.clientX;
			lastMouseY = e.clientY;
			e.preventDefault();
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isPanning) return;
		const dx = e.clientX - lastMouseX;
		const dy = e.clientY - lastMouseY;
		panX += dx;
		panY += dy;
		lastMouseX = e.clientX;
		lastMouseY = e.clientY;
	}

	function handleMouseUp() {
		isPanning = false;
	}

	// --- Keyboard shortcuts ---
	function handleKeyDown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
			e.preventDefault();
			zoomIn();
		} else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
			e.preventDefault();
			zoomOut();
		} else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
			e.preventDefault();
			fitToScreen();
		}
	}

	function clampZoom(z: number): number {
		return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
	}

	function zoomToCenter(factor: number) {
		const cx = containerWidth / 2;
		const cy = containerHeight / 2;
		const paperX = (cx - panX) / zoom;
		const paperY = (cy - panY) / zoom;
		const newZoom = clampZoom(zoom * factor);
		panX = cx - paperX * newZoom;
		panY = cy - paperY * newZoom;
		zoom = newZoom;
	}

	function zoomIn() {
		zoomToCenter(ZOOM_FACTOR);
	}

	function zoomOut() {
		zoomToCenter(1 / ZOOM_FACTOR);
	}

	function fitToScreen() {
		if (containerWidth === 0 || containerHeight === 0) return;

		const padding = 0.9;
		const availW = containerWidth * padding;
		const availH = containerHeight * padding;

		const zoomX = availW / geometry.paperWidthMm;
		const zoomY = availH / geometry.paperHeightMm;
		const newZoom = clampZoom(Math.min(zoomX, zoomY));

		const paperW = geometry.paperWidthMm * newZoom;
		const paperH = geometry.paperHeightMm * newZoom;

		panX = (containerWidth - paperW) / 2;
		panY = (containerHeight - paperH) / 2;
		zoom = newZoom;
	}

	// --- Global event listeners ---
	$effect(() => {
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	});

	$effect(() => {
		const up = () => {
			isPanning = false;
		};
		document.addEventListener('mouseup', up);
		document.addEventListener('mouseleave', up);
		return () => {
			document.removeEventListener('mouseup', up);
			document.removeEventListener('mouseleave', up);
		};
	});

	// Zoom percentage for display
	let zoomPercent = $derived(Math.round((zoom / fitZoomLevel()) * 100));

	function fitZoomLevel(): number {
		if (containerWidth === 0 || containerHeight === 0) return 1;
		const padding = 0.9;
		const zoomX = (containerWidth * padding) / geometry.paperWidthMm;
		const zoomY = (containerHeight * padding) / geometry.paperHeightMm;
		return Math.min(zoomX, zoomY);
	}
</script>

<div class="relative flex h-full flex-col bg-gray-100">
	<!-- Zoom controls -->
	<div class="absolute top-4 right-4 z-20 flex flex-col gap-2">
		<div class="rounded-lg border border-gray-300 bg-white shadow-lg">
			<button
				type="button"
				class="block h-10 w-10 border-b border-gray-200 text-gray-700 transition-colors hover:bg-gray-50"
				onclick={zoomIn}
				title="Zoom in (Ctrl/Cmd + +)"
			>
				<svg class="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
			</button>
			<button
				type="button"
				class="block h-10 w-10 border-b border-gray-200 text-gray-700 transition-colors hover:bg-gray-50"
				onclick={() => fitToScreen()}
				title="Reset zoom (Ctrl/Cmd + 0)"
			>
				<span class="text-xs font-medium">{zoomPercent}%</span>
			</button>
			<button
				type="button"
				class="block h-10 w-10 border-b border-gray-200 text-gray-700 transition-colors hover:bg-gray-50"
				onclick={zoomOut}
				title="Zoom out (Ctrl/Cmd + -)"
			>
				<svg class="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
				</svg>
			</button>
			<button
				type="button"
				class="block h-10 w-10 text-gray-700 transition-colors hover:bg-gray-50"
				onclick={() => fitToScreen()}
				title="Fit to screen"
			>
				<svg class="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
					/>
				</svg>
			</button>
		</div>
	</div>

	<!-- Help text -->
	<div
		class="absolute bottom-4 left-4 z-20 rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-xs text-gray-600 shadow-lg backdrop-blur-sm"
	>
		<p><strong>Zoom:</strong> Mouse wheel or Ctrl/Cmd +/-</p>
		<p><strong>Pan:</strong> Click and drag</p>
		<p><strong>Fit:</strong> Click fit button or Ctrl/Cmd 0</p>
	</div>

	{#if isPreparing && ticketCacheEmpty()}
		<div class="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
			<div class="text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
				<p class="mt-4 text-sm text-gray-600">Rendering tickets…</p>
			</div>
		</div>
	{/if}

	{#if error}
		<div class="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 text-red-600">
			<div class="text-center">
				<p class="text-sm font-medium">Preview Error</p>
				<p class="mt-1 text-xs text-gray-600">{error}</p>
			</div>
		</div>
	{/if}

	<!-- Canvas container -->
	<div
		bind:this={containerRef}
		class="h-full w-full overflow-hidden"
		style="cursor: {isPanning ? 'grabbing' : 'grab'};"
		onwheel={handleWheel}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		role="img"
		aria-label="Sheet preview"
		tabindex="-1"
	>
		<canvas
			bind:this={canvas}
			class="block h-full w-full"
			class:opacity-60={isPreparing}
			style="image-rendering: auto; transition: opacity 0.15s;"
		></canvas>
	</div>
</div>
