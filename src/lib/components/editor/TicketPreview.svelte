<script lang="ts">
	import { untrack } from 'svelte';
	import type { Project, Stamp } from '$lib/types';
	import { TicketRenderer } from '$lib/canvas/TicketRenderer';
	import { blobToImageBitmap } from '$lib/utils/image';

	interface Props {
		project: Project;
		selectedRecord: Record<string, string>;
		selectedStampId?: string | null;
		onSelectStamp?: (id: string | null) => void;
		onUpdateStamp?: (stamp: Stamp) => void;
	}

	let {
		project,
		selectedRecord,
		selectedStampId = null,
		onSelectStamp,
		onUpdateStamp
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
		// We only want to sync when NOT dragging to avoid jumping
		if (!isDragging) {
			localStamps = project.stamps;
		}
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
				});
			}
		});
	});

	function drawSelectionOverlay(
		ctx: CanvasRenderingContext2D,
		stamps: Stamp[],
		stampId: string | null,
		dpi: number
	) {
		if (!stampId) return;

		const stamp = stamps.find((s) => s.id === stampId);
		if (!stamp) return;

		ctx.save();
		ctx.scale(dpi, dpi);

		// Selection box
		ctx.strokeStyle = '#3b82f6';
		ctx.lineWidth = 2;
		ctx.setLineDash([5, 5]);
		ctx.strokeRect(stamp.x - 2, stamp.y - 2, stamp.width + 4, stamp.height + 4);

		// Handles
		ctx.fillStyle = '#3b82f6';
		const handleSize = 6;
		const corners = [
			[stamp.x, stamp.y],
			[stamp.x + stamp.width, stamp.y],
			[stamp.x, stamp.y + stamp.height],
			[stamp.x + stamp.width, stamp.y + stamp.height]
		];

		for (const [cx, cy] of corners) {
			ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
		}

		ctx.restore();
	}

	function handleCanvasClick(event: MouseEvent) {
		if (!canvasElement || !templateImage) return;

		const rect = canvasElement.getBoundingClientRect();
		const x = (event.clientX - rect.left) / scale;
		const y = (event.clientY - rect.top) / scale;

		const clickedStamp = [...localStamps].reverse().find((stamp) => {
			return (
				x >= stamp.x && x <= stamp.x + stamp.width && y >= stamp.y && y <= stamp.y + stamp.height
			);
		});

		onSelectStamp?.(clickedStamp ? clickedStamp.id : null);
	}

	// Interaction state
	let isDragging = $state(false);
	let dragStartPos = { x: 0, y: 0 };
	let initialStampPos = { x: 0, y: 0 };

	function handleMouseDown(event: MouseEvent) {
		if (!selectedStampId || !canvasElement) return;

		const stamp = localStamps.find((s) => s.id === selectedStampId);
		if (!stamp) return;

		const rect = canvasElement.getBoundingClientRect();
		const x = (event.clientX - rect.left) / scale;
		const y = (event.clientY - rect.top) / scale;

		if (x >= stamp.x && x <= stamp.x + stamp.width && y >= stamp.y && y <= stamp.y + stamp.height) {
			isDragging = true;
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
