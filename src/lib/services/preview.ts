import type { SheetLayout } from '$lib/types';

export async function generatePreviewPng(
	layout: SheetLayout,
	ticketImages: Uint8Array[],
	ticketWidthPx: number,
	ticketHeightPx: number
): Promise<string> {
	// Dynamically import the WASM module
	const { generate_preview_png, default: init } = await import('$lib/wasm/pdf_generator');
	await init();

	// Account for orientation
	const paperWidthMm =
		layout.orientation === 'landscape' ? layout.paperSize.heightMm : layout.paperSize.widthMm;
	const paperHeightMm =
		layout.orientation === 'landscape' ? layout.paperSize.widthMm : layout.paperSize.heightMm;

	const config = {
		paper_width_mm: paperWidthMm,
		paper_height_mm: paperHeightMm,
		rows: layout.rows,
		cols: layout.cols,
		margin_top_mm: layout.marginTop,
		margin_right_mm: layout.marginRight,
		margin_bottom_mm: layout.marginBottom,
		margin_left_mm: layout.marginLeft,
		spacing_x_mm: layout.spacingX,
		spacing_y_mm: layout.spacingY
	};

	const configJson = JSON.stringify(config);

	// Concatenate all ticket images into a single Uint8Array
	const totalBytes = ticketImages.length * ticketWidthPx * ticketHeightPx * 4;
	const imageData = new Uint8Array(totalBytes);
	let offset = 0;
	for (const img of ticketImages) {
		imageData.set(img, offset);
		offset += img.length;
	}

	try {
		const pngBytes = generate_preview_png(configJson, imageData, ticketWidthPx, ticketHeightPx);

		// Convert to data URL
		const blob = new Blob(
			[pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength)],
			{ type: 'image/png' }
		);
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	} catch (error) {
		console.error('Failed to generate preview PNG:', error);
		throw error;
	}
}
