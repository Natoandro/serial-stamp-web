<script lang="ts">
	import { renderWasmPreviewToCanvas, clearTemplateCache } from '$lib/services/wasmPreview';
	import type { Project, SheetLayout } from '$lib/types';

	interface Props {
		project: Project;
		layout: SheetLayout;
	}

	let { project, layout }: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let containerRef = $state<HTMLDivElement | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
	let isFirstRender = $state(true);

	// Zoom state
	let zoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let lastMouseX = $state(0);
	let lastMouseY = $state(0);

	const MIN_ZOOM = 0.1;
	const MAX_ZOOM = 5;
	const ZOOM_STEP = 0.1;

	// Generate preview when dependencies change (debounced, direct canvas rendering)
	$effect(() => {
		// Track dependencies
		const deps = {
			templateImage: project.templateImage,
			stamps: project.stamps,
			dataSources: project.dataSources,
			layout: layout
		};

		if (!deps.templateImage || !canvas) {
			error = null;
			isLoading = false;
			if (debounceTimeout) clearTimeout(debounceTimeout);
			return;
		}

		// Clear existing timeout
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
		}

		// Only show loading spinner on first render
		if (isFirstRender) {
			isLoading = true;
		}
		error = null;

		// Debounce the actual preview generation (reduced to 100ms for snappier feel)
		debounceTimeout = setTimeout(async () => {
			try {
				// Render directly to canvas - no PNG encoding overhead!
				await renderWasmPreviewToCanvas(project, layout, canvas!);
				isFirstRender = false;
			} catch (err) {
				console.error('Failed to generate preview:', err);
				error = err instanceof Error ? err.message : 'Failed to generate preview';
			} finally {
				isLoading = false;
			}
		}, 100); // Reduced from 300ms to 100ms - WASM is fast enough
	});

	// Track template changes to clear cache
	let previousTemplate = $state<Blob | null>(null);
	$effect(() => {
		if (project.templateImage !== previousTemplate) {
			clearTemplateCache();
			previousTemplate = project.templateImage;
		}
	});

	// Zoom functions
	function handleWheel(e: WheelEvent) {
		e.preventDefault();

		if (!canvas || !containerRef) return;

		const containerRect = containerRef.getBoundingClientRect();
		const canvasRect = canvas.getBoundingClientRect();

		// Mouse position relative to container
		const mouseX = e.clientX - containerRect.left;
		const mouseY = e.clientY - containerRect.top;

		// Mouse position relative to the canvas (accounting for current transform)
		const canvasLeft = canvasRect.left - containerRect.left;
		const canvasTop = canvasRect.top - containerRect.top;

		// Point on canvas before zoom (in canvas coordinate space)
		const canvasPointX = (mouseX - canvasLeft) / zoom;
		const canvasPointY = (mouseY - canvasTop) / zoom;

		// Calculate new zoom
		const delta = -e.deltaY * 0.001;
		const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));

		if (newZoom !== zoom) {
			// Calculate new pan to keep the point under the mouse stationary
			panX = mouseX - canvasPointX * newZoom;
			panY = mouseY - canvasPointY * newZoom;
			zoom = newZoom;
		}
	}

	function handleMouseDown(e: MouseEvent) {
		if (e.button === 0) {
			// Left click
			isPanning = true;
			lastMouseX = e.clientX;
			lastMouseY = e.clientY;
			e.preventDefault();
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (isPanning) {
			const deltaX = e.clientX - lastMouseX;
			const deltaY = e.clientY - lastMouseY;
			panX += deltaX;
			panY += deltaY;
			lastMouseX = e.clientX;
			lastMouseY = e.clientY;
		}
	}

	function handleMouseUp() {
		isPanning = false;
	}

	function handleKeyDown(e: KeyboardEvent) {
		// Zoom in: Ctrl/Cmd + Plus/Equals
		if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
			e.preventDefault();
			zoomIn();
		}
		// Zoom out: Ctrl/Cmd + Minus
		else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
			e.preventDefault();
			zoomOut();
		}
		// Reset zoom: Ctrl/Cmd + 0
		else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
			e.preventDefault();
			resetZoom();
		}
	}

	function zoomIn() {
		if (!canvas || !containerRef) return;

		const containerRect = containerRef.getBoundingClientRect();

		// Zoom towards center of container
		const centerX = containerRect.width / 2;
		const centerY = containerRect.height / 2;

		const canvasRect = canvas.getBoundingClientRect();
		const canvasLeft = canvasRect.left - containerRect.left;
		const canvasTop = canvasRect.top - containerRect.top;

		const canvasPointX = (centerX - canvasLeft) / zoom;
		const canvasPointY = (centerY - canvasTop) / zoom;

		const newZoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);

		panX = centerX - canvasPointX * newZoom;
		panY = centerY - canvasPointY * newZoom;
		zoom = newZoom;
	}

	function zoomOut() {
		if (!canvas || !containerRef) return;

		const containerRect = containerRef.getBoundingClientRect();

		// Zoom towards center of container
		const centerX = containerRect.width / 2;
		const centerY = containerRect.height / 2;

		const canvasRect = canvas.getBoundingClientRect();
		const canvasLeft = canvasRect.left - containerRect.left;
		const canvasTop = canvasRect.top - containerRect.top;

		const canvasPointX = (centerX - canvasLeft) / zoom;
		const canvasPointY = (centerY - canvasTop) / zoom;

		const newZoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);

		panX = centerX - canvasPointX * newZoom;
		panY = centerY - canvasPointY * newZoom;
		zoom = newZoom;
	}

	function resetZoom() {
		zoom = 1;
		panX = 0;
		panY = 0;
	}

	function fitToScreen() {
		if (!canvas || !containerRef) return;

		const containerRect = containerRef.getBoundingClientRect();
		const canvasWidth = canvas.width;
		const canvasHeight = canvas.height;

		if (canvasWidth === 0 || canvasHeight === 0) return;

		// Add some padding (10% on each side)
		const padding = 0.9;
		const containerWidth = containerRect.width * padding;
		const containerHeight = containerRect.height * padding;

		// Calculate scale to fit
		const scaleX = containerWidth / canvasWidth;
		const scaleY = containerHeight / canvasHeight;
		const newZoom = Math.min(scaleX, scaleY);

		// Center the canvas
		const scaledWidth = canvasWidth * newZoom;
		const scaledHeight = canvasHeight * newZoom;

		panX = (containerRect.width - scaledWidth) / 2;
		panY = (containerRect.height - scaledHeight) / 2;
		zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
	}

	// Setup keyboard listeners
	$effect(() => {
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	});

	// Cleanup mouse listeners on unmount
	$effect(() => {
		const handleGlobalMouseUp = () => {
			isPanning = false;
		};
		document.addEventListener('mouseup', handleGlobalMouseUp);
		document.addEventListener('mouseleave', handleGlobalMouseUp);
		return () => {
			document.removeEventListener('mouseup', handleGlobalMouseUp);
			document.removeEventListener('mouseleave', handleGlobalMouseUp);
		};
	});

	// Fit to screen when canvas first loads
	$effect(() => {
		if (canvas && canvas.width > 0 && canvas.height > 0 && isFirstRender === false) {
			// Small delay to ensure canvas is rendered
			setTimeout(() => fitToScreen(), 50);
		}
	});
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
				onclick={resetZoom}
				title="Reset zoom (Ctrl/Cmd + 0)"
			>
				<span class="text-xs font-medium">{Math.round(zoom * 100)}%</span>
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
				onclick={fitToScreen}
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
		<p><strong>Fit:</strong> Click fit button or reload preview</p>
	</div>

	{#if isLoading && isFirstRender}
		<!-- Only show spinner on first load, not on updates -->
		<div class="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
			<div class="text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
				<p class="mt-4 text-sm text-gray-600">Generating preview...</p>
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

	<!-- Canvas container with zoom/pan -->
	<div
		bind:this={containerRef}
		class="flex h-full items-center justify-center overflow-hidden"
		style="cursor: {isPanning ? 'grabbing' : 'grab'};"
		onwheel={handleWheel}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		role="img"
		aria-label="Sheet preview"
		tabindex="-1"
	>
		<!-- Canvas wrapper with transform -->
		<div
			style="transform: translate({panX}px, {panY}px) scale({zoom}); transform-origin: top left; transition: opacity 0.2s;"
			class:opacity-50={isLoading && !isFirstRender}
		>
			<canvas bind:this={canvas} style="image-rendering: auto; display: block;"></canvas>
		</div>
	</div>
</div>
