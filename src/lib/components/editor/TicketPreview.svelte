<script lang="ts">
	import { untrack } from 'svelte';
	import type { Project, Stamp, TextStamp } from '$lib/types';
	import { TicketRenderer } from '$lib/canvas/TicketRenderer';
	import { blobToImageBitmap } from '$lib/utils/image';

	interface Props {
		project: Project;
		selectedRecord: Record<string, string>;
		selectedStampId?: string | null;
		onSelectStamp?: (id: string | null) => void;
		onUpdateStamp?: (stamp: Stamp) => void;
		onDimensionsChange?: (id: string, width: number, height: number) => void;
	}

	export function getStampDimensions(stamp: Stamp) {
		if (stamp.type === 'text' && renderer) {
			return renderer.measureText(stamp as TextStamp, selectedRecord);
		}
		return { width: stamp.width, height: stamp.height };
	}

	let {
		project,
		selectedRecord,
		selectedStampId = null,
		onSelectStamp,
		onUpdateStamp,
		onDimensionsChange
	}: Props = $props();

	let canvasElement = $state<HTMLCanvasElement | null>(null);
	let containerElement = $state<HTMLDivElement | null>(null);
	let templateImage = $state<ImageBitmap | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let lastImageInfo = { size: 0, type: '' };

	// Display properties
	let displayWidth = $state(0);
	let displayHeight = $state(0);
	let scale = $derived(templateImage ? displayWidth / templateImage.width : 1);

	/**
	 * Local stamps state to ensure smooth dragging.
	 * We sync this with the project stamps, but updates during dragging happen here first
	 * so the UI doesn't lag waiting for the database/parent update.
	 */
	let localStamps = $state<Stamp[]>([]);

	// Sync local stamps when project stamps change (from external updates)
	$effect(() => {
		const stamps = project.stamps;
		// We use untrack to ensure this effect ONLY runs when stamps change,
		// not when isDragging changes (which would cause a revert to old data on mouseup).
		untrack(() => {
			if (!isDragging) {
				localStamps = stamps;
			}
		});
	});

	// The renderer helper
	let renderer: TicketRenderer | null = null;

	// Load template image
	$effect(() => {
		const blob = project.templateImage;
		if (!blob) return;

		// Skip reloading if the image content hasn't changed (prevents flickering on project updates)
		if (
			blob.size === lastImageInfo.size &&
			blob.type === lastImageInfo.type &&
			untrack(() => templateImage)
		) {
			return;
		}

		lastImageInfo = { size: blob.size, type: blob.type };

		blobToImageBitmap(blob)
			.then((bitmap) => {
				const oldImage = untrack(() => templateImage);
				templateImage = bitmap;
				if (oldImage) oldImage.close();
				isLoading = false;
				error = null;
			})
			.catch((err) => {
				console.error('Failed to load template image:', err);
				error = 'Failed to load template image';
				isLoading = false;
			});
	});

	// Main rendering effect
	$effect(() => {
		// Track dependencies
		const stamps = localStamps;
		const record = selectedRecord;
		const stampId = selectedStampId;
		const img = templateImage;
		const canvas = canvasElement;
		const container = containerElement;

		if (!img || !canvas || !container) return;

		untrack(() => {
			const containerWidth = container.clientWidth;
			const aspectRatio = img.height / img.width;

			displayWidth = containerWidth;
			displayHeight = containerWidth * aspectRatio;

			const dpi = window.devicePixelRatio || 1;
			const targetWidth = img.width * dpi;
			const targetHeight = img.height * dpi;

			if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
				canvas.width = targetWidth;
				canvas.height = targetHeight;
			}

			const ctx = canvas.getContext('2d');
			if (ctx) {
				renderer = new TicketRenderer({
					ctx,
					templateImage: img,
					stamps,
					dpiScale: dpi
				});

				renderer.render(record).then(() => {
					drawSelectionOverlay(ctx, stamps, stampId, dpi);

					// Sync measured dimensions back to parent if needed
					stamps.forEach((s) => {
						if (s.type === 'text' && (s as TextStamp).autoSize) {
							const dims = renderer!.measureText(s as TextStamp, record);
							if (
								Math.round(s.width) !== Math.round(dims.width) ||
								Math.round(s.height) !== Math.round(dims.height)
							) {
								// Update locally to avoid flicker
								s.width = dims.width;
								s.height = dims.height;
								// Notify parent
								onDimensionsChange?.(s.id, dims.width, dims.height);
							}
						}
					});
				});
			}
		});
	});

	function getVisualBounds(stamp: Stamp) {
		if (stamp.type === 'text' && (stamp as TextStamp).autoSize && renderer) {
			const dims = renderer.measureText(stamp as TextStamp, selectedRecord);
			let x = stamp.x;
			let y = stamp.y;

			// Adjust x based on alignment
			if (stamp.alignment === 'center') x -= dims.width / 2;
			else if (stamp.alignment === 'right') x -= dims.width;

			// Adjust y based on verticalAlign
			const vAlign = (stamp as TextStamp).verticalAlign;
			if (vAlign === 'middle') y -= dims.height / 2;
			else if (vAlign === 'bottom') y -= dims.height;

			return { x, y, width: dims.width, height: dims.height };
		}
		return { x: stamp.x, y: stamp.y, width: stamp.width, height: stamp.height };
	}

	function drawSelectionOverlay(
		ctx: CanvasRenderingContext2D,
		stamps: Stamp[],
		stampId: string | null,
		dpi: number
	) {
		if (!stampId) return;

		const stamp = stamps.find((s) => s.id === stampId);
		if (!stamp) return;

		const bounds = getVisualBounds(stamp);

		ctx.save();
		ctx.scale(dpi, dpi);

		// Selection box
		ctx.strokeStyle = '#3b82f6';
		ctx.lineWidth = 2;
		ctx.setLineDash([5, 5]);
		ctx.strokeRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4);

		// Handles (only show if not auto-sized)
		if (stamp.type !== 'text' || !(stamp as TextStamp).autoSize) {
			ctx.fillStyle = '#3b82f6';
			const handleSize = 6;
			const corners = [
				[bounds.x, bounds.y],
				[bounds.x + bounds.width, bounds.y],
				[bounds.x, bounds.y + bounds.height],
				[bounds.x + bounds.width, bounds.y + bounds.height]
			];

			for (const [cx, cy] of corners) {
				ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
			}
		}

		// Draw anchor point
		ctx.fillStyle = '#ef4444'; // red-500
		ctx.beginPath();
		ctx.arc(stamp.x, stamp.y, 3, 0, Math.PI * 2);
		ctx.fill();

		ctx.restore();
	}

	function handleCanvasClick(event: MouseEvent) {
		if (!canvasElement || !templateImage || hasDragged) return;

		const rect = canvasElement.getBoundingClientRect();
		const x = (event.clientX - rect.left) / scale;
		const y = (event.clientY - rect.top) / scale;

		// Find stamp under cursor (reverse order to get top-most)
		const clickedStamp = [...localStamps].reverse().find((stamp) => {
			const b = getVisualBounds(stamp);
			return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
		});

		onSelectStamp?.(clickedStamp ? clickedStamp.id : null);
	}

	// Interaction state
	let isDragging = $state(false);
	let hasDragged = false;
	let dragStartPos = { x: 0, y: 0 };
	let initialStampPos = { x: 0, y: 0 };

	function handleMouseDown(event: MouseEvent) {
		if (!selectedStampId || !canvasElement) return;

		const stamp = localStamps.find((s) => s.id === selectedStampId);
		if (!stamp) return;

		const rect = canvasElement.getBoundingClientRect();
		const x = (event.clientX - rect.left) / scale;
		const y = (event.clientY - rect.top) / scale;

		const b = getVisualBounds(stamp);

		if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
			isDragging = true;
			hasDragged = false;
			dragStartPos = { x, y };
			initialStampPos = { x: stamp.x, y: stamp.y };

			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('mouseup', handleMouseUp);
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging || !selectedStampId || !canvasElement) return;

		const rect = canvasElement.getBoundingClientRect();
		const x = (event.clientX - rect.left) / scale;
		const y = (event.clientY - rect.top) / scale;

		const dx = x - dragStartPos.x;
		const dy = y - dragStartPos.y;

		const newX = Math.round(initialStampPos.x + dx);
		const newY = Math.round(initialStampPos.y + dy);

		if (newX !== initialStampPos.x || newY !== initialStampPos.y) {
			hasDragged = true;
		}

		// Update local state immediately for 60fps movement
		localStamps = localStamps.map((s) =>
			s.id === selectedStampId ? { ...s, x: newX, y: newY } : s
		);

		// Notify parent (which usually debounces the DB write)
		const updatedStamp = localStamps.find((s) => s.id === selectedStampId);
		if (updatedStamp) {
			onUpdateStamp?.(updatedStamp);
		}
	}

	function handleMouseUp() {
		isDragging = false;
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('mouseup', handleMouseUp);
	}
</script>

<div
	bind:this={containerElement}
	class="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-inner"
	style="min-height: 200px;"
>
	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<div class="text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
				<p class="mt-4 text-sm text-gray-600">Loading preview...</p>
			</div>
		</div>
	{:else if error}
		<div class="flex h-64 items-center justify-center text-red-600">
			{error}
		</div>
	{:else}
		<canvas
			bind:this={canvasElement}
			onclick={handleCanvasClick}
			onmousedown={handleMouseDown}
			class="mx-auto block touch-none bg-white {isDragging
				? 'cursor-grabbing'
				: 'cursor-crosshair'}"
			style="width: {displayWidth}px; height: {displayHeight}px;"
		></canvas>
	{/if}
</div>

<style>
	canvas {
		image-rendering: pixelated;
		image-rendering: crisp-edges;
	}
</style>
