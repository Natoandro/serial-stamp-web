<script lang="ts">
	import { generatePreviewPng } from '$lib/services/preview';
	import { generateRecords } from '$lib/engine/data';
	import { TicketRenderer } from '$lib/canvas/TicketRenderer';
	import { blobToImageBitmap } from '$lib/utils/image';
	import type { Project, SheetLayout } from '$lib/types';

	interface Props {
		project: Project;
		layout: SheetLayout;
	}

	let { project, layout }: Props = $props();

	// Paper dimensions from layout, accounting for orientation
	const paperWidth = $derived(
		layout.orientation === 'landscape' ? layout.paperSize.heightMm : layout.paperSize.widthMm
	);
	const paperHeight = $derived(
		layout.orientation === 'landscape' ? layout.paperSize.widthMm : layout.paperSize.heightMm
	);

	// Calculated ticket dimensions in mm
	// Formula: (TotalWidth - LeftMargin - RightMargin - (Cols - 1) * SpacingX) / Cols
	const ticketWidthMm = $derived(
		layout.cols > 0
			? (paperWidth -
					layout.marginLeft -
					layout.marginRight -
					(layout.cols - 1) * layout.spacingX) /
					layout.cols
			: 0
	);
	const ticketHeightMm = $derived(
		layout.rows > 0
			? (paperHeight -
					layout.marginTop -
					layout.marginBottom -
					(layout.rows - 1) * layout.spacingY) /
					layout.rows
			: 0
	);

	let previewUrl = $state<string | null>(null);
	let isLoading = $state(false);
	let templateImageBitmap = $state<ImageBitmap | null>(null);

	// Load template image
	$effect(() => {
		const blob = project.templateImage;
		if (!blob) {
			templateImageBitmap = null;
			return;
		}

		blobToImageBitmap(blob)
			.then((bitmap) => {
				templateImageBitmap = bitmap;
			})
			.catch((error) => {
				console.error('Failed to load template image:', error);
				templateImageBitmap = null;
			});
	});

	// Generate preview when dependencies change
	$effect(() => {
		if (!templateImageBitmap || ticketWidthMm <= 0 || ticketHeightMm <= 0) {
			previewUrl = null;
			return;
		}

		isLoading = true;

		(async () => {
			try {
				// Generate records
				const records = generateRecords(project.dataSources);
				const ticketsPerPage = layout.rows * layout.cols;
				const recordsToRender = records.slice(0, ticketsPerPage);

				// Assume 300 DPI for ticket rendering
				const dpi = 300;
				const mmPerInch = 25.4;
				const pixelsPerMm = dpi / mmPerInch;

				// Get template dimensions
				const templateWidth = templateImageBitmap.width;
				const templateHeight = templateImageBitmap.height;

				// Calculate scale to fit template to target mm size
				const targetWidthPx = ticketWidthMm * pixelsPerMm;
				const targetHeightPx = ticketHeightMm * pixelsPerMm;
				const scaleX = targetWidthPx / templateWidth;
				const scaleY = targetHeightPx / templateHeight;
				const scale = Math.min(scaleX, scaleY); // Use the smaller scale to fit without distortion

				const ticketWidthPx = Math.round(templateWidth * scale);
				const ticketHeightPx = Math.round(templateHeight * scale);

				// Create offscreen canvas for rendering
				const canvas = new OffscreenCanvas(ticketWidthPx, ticketHeightPx);
				const ctx = canvas.getContext('2d');
				if (!ctx) throw new Error('Failed to get canvas context');

				const renderer = new TicketRenderer({
					ctx,
					templateImage: templateImageBitmap,
					stamps: project.stamps,
					dataSources: project.dataSources,
					dpiScale: scale
				});

				const ticketImages: Uint8Array[] = [];

				for (const record of recordsToRender) {
					await renderer.render(record);
					const imageData = ctx.getImageData(0, 0, ticketWidthPx, ticketHeightPx);
					ticketImages.push(new Uint8Array(imageData.data.buffer.slice()));
				}

				// Generate preview PNG
				const pngDataUrl = await generatePreviewPng(
					layout,
					ticketImages,
					ticketWidthPx,
					ticketHeightPx
				);
				previewUrl = pngDataUrl;
			} catch (error) {
				console.error('Failed to generate preview:', error);
				previewUrl = null;
			} finally {
				isLoading = false;
			}
		})();
	});
</script>

<div class="flex h-full items-center justify-center bg-gray-100">
	{#if isLoading}
		<div class="flex h-full items-center justify-center">
			<div class="text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
				<p class="mt-4 text-sm text-gray-600">Generating preview...</p>
			</div>
		</div>
	{:else if previewUrl}
		<img src={previewUrl} alt="Sheet preview" class="h-full w-full object-contain" />
	{:else}
		<div class="flex h-full items-center justify-center text-gray-500">
			<p class="text-sm">No preview available</p>
		</div>
	{/if}
</div>

<style>
	.shadow-2xl {
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
	}
</style>
