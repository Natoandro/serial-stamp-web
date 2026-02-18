import type { Project, SheetLayout, Stamp } from '$lib/types';
import { generateRecords } from '$lib/engine/data';

let wasmModule: typeof import('$lib/wasm/pdf_generator') | null = null;
let wasmInitialized = false;

/**
 * Initialize the WASM module (lazy loading)
 */
async function initWasm() {
	if (wasmInitialized && wasmModule) {
		return wasmModule;
	}

	const module = await import('$lib/wasm/pdf_generator');
	await module.default();
	wasmModule = module;
	wasmInitialized = true;
	return module;
}

/**
 * Convert template image blob to RGBA data for WASM
 */
async function blobToRgbaData(
	blob: Blob
): Promise<{ width: number; height: number; data: Uint8Array }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const canvas = new OffscreenCanvas(img.width, img.height);
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				reject(new Error('Failed to get canvas context'));
				return;
			}

			ctx.drawImage(img, 0, 0);
			const imageData = ctx.getImageData(0, 0, img.width, img.height);

			resolve({
				width: img.width,
				height: img.height,
				data: new Uint8Array(imageData.data.buffer)
			});
		};
		img.onerror = () => reject(new Error('Failed to load image'));
		img.src = URL.createObjectURL(blob);
	});
}

/**
 * Serialize stamps to match WASM-expected format
 */
function serializeStamps(stamps: Stamp[]): unknown[] {
	return stamps.map((stamp) => {
		// Return stamp as-is since the TypeScript types match the Rust Deserialize expectations
		return stamp;
	});
}

/**
 * Generate sheet preview entirely in WASM (high performance)
 * Returns a data URL for direct rendering in an <img> or <canvas>
 */
export async function generateWasmPreview(project: Project, layout: SheetLayout): Promise<string> {
	const wasm = await initWasm();

	if (!project.templateImage) {
		throw new Error('No template image available');
	}

	// Convert template image to RGBA data
	const templateData = await blobToRgbaData(project.templateImage);

	// Generate records
	const records = generateRecords(project.dataSources);
	const ticketsPerPage = layout.rows * layout.cols;
	const recordsToRender = records.slice(0, ticketsPerPage);

	// Convert records to simple key-value objects
	const serializedRecords = recordsToRender.map((record) => {
		const obj: Record<string, string> = {};
		for (const key in record) {
			obj[key] = String(record[key]);
		}
		return obj;
	});

	// Paper dimensions accounting for orientation
	const paperWidth =
		layout.orientation === 'landscape' ? layout.paperSize.heightMm : layout.paperSize.widthMm;
	const paperHeight =
		layout.orientation === 'landscape' ? layout.paperSize.widthMm : layout.paperSize.heightMm;

	// Build config object (without template data - passed separately)
	const config = {
		sheet_config: {
			paper_width_mm: paperWidth,
			paper_height_mm: paperHeight,
			rows: layout.rows,
			cols: layout.cols,
			margin_top_mm: layout.marginTop,
			margin_right_mm: layout.marginRight,
			margin_bottom_mm: layout.marginBottom,
			margin_left_mm: layout.marginLeft,
			spacing_x_mm: layout.spacingX,
			spacing_y_mm: layout.spacingY
		},
		template_width: templateData.width,
		template_height: templateData.height,
		stamps: serializeStamps(project.stamps),
		records: serializedRecords,
		dpi: 300
	};

	// Calculate output dimensions BEFORE calling WASM
	// These must match exactly what WASM calculates
	const dpi = 300;
	const mmPerInch = 25.4;
	const pixelsPerMm = dpi / mmPerInch;
	const width = Math.round(paperWidth * pixelsPerMm);
	const height = Math.round(paperHeight * pixelsPerMm);

	// Call WASM render function - pass template data as separate Uint8Array
	const configJson = JSON.stringify(config);
	const rgbaBytes = wasm.render_sheet(configJson, templateData.data);

	// Validate data length
	if (rgbaBytes.length !== width * height * 4) {
		throw new Error(
			`WASM returned incorrect data size.\n` +
				`Expected: ${width * height * 4} bytes (${width}px × ${height}px × 4 channels)\n` +
				`Got: ${rgbaBytes.length} bytes\n` +
				`Paper: ${paperWidth}mm × ${paperHeight}mm at ${dpi} DPI\n` +
				`This suggests a dimension calculation mismatch between TS and Rust.`
		);
	}

	// Convert RGBA bytes to ImageData
	const imageData = new ImageData(new Uint8ClampedArray(rgbaBytes), width, height);

	// Render to canvas and convert to data URL
	const canvas = new OffscreenCanvas(width, height);
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Failed to get canvas context');
	}

	ctx.putImageData(imageData, 0, 0);

	// Convert to blob then data URL
	const blob = await canvas.convertToBlob({ type: 'image/png' });
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

/**
 * Generate preview and render directly to a canvas element (even faster - no PNG encoding)
 */
export async function renderWasmPreviewToCanvas(
	project: Project,
	layout: SheetLayout,
	canvas: HTMLCanvasElement | OffscreenCanvas
): Promise<void> {
	const wasm = await initWasm();

	if (!project.templateImage) {
		throw new Error('No template image available');
	}

	// Convert template image to RGBA data
	const templateData = await blobToRgbaData(project.templateImage);

	// Generate records
	const records = generateRecords(project.dataSources);
	const ticketsPerPage = layout.rows * layout.cols;
	const recordsToRender = records.slice(0, ticketsPerPage);

	// Convert records to simple key-value objects
	const serializedRecords = recordsToRender.map((record) => {
		const obj: Record<string, string> = {};
		for (const key in record) {
			obj[key] = String(record[key]);
		}
		return obj;
	});

	// Paper dimensions accounting for orientation
	const paperWidth =
		layout.orientation === 'landscape' ? layout.paperSize.heightMm : layout.paperSize.widthMm;
	const paperHeight =
		layout.orientation === 'landscape' ? layout.paperSize.widthMm : layout.paperSize.heightMm;

	// Build config object (without template data - passed separately)
	const config = {
		sheet_config: {
			paper_width_mm: paperWidth,
			paper_height_mm: paperHeight,
			rows: layout.rows,
			cols: layout.cols,
			margin_top_mm: layout.marginTop,
			margin_right_mm: layout.marginRight,
			margin_bottom_mm: layout.marginBottom,
			margin_left_mm: layout.marginLeft,
			spacing_x_mm: layout.spacingX,
			spacing_y_mm: layout.spacingY
		},
		template_width: templateData.width,
		template_height: templateData.height,
		stamps: serializeStamps(project.stamps),
		records: serializedRecords,
		dpi: 300
	};

	// Calculate output dimensions BEFORE calling WASM
	const dpi = 300;
	const mmPerInch = 25.4;
	const pixelsPerMm = dpi / mmPerInch;
	const width = Math.round(paperWidth * pixelsPerMm);
	const height = Math.round(paperHeight * pixelsPerMm);

	// Call WASM render function - pass template data as separate Uint8Array
	const configJson = JSON.stringify(config);
	const rgbaBytes = wasm.render_sheet(configJson, templateData.data);

	// Validate data length
	if (rgbaBytes.length !== width * height * 4) {
		throw new Error(
			`WASM returned incorrect data size. Expected ${width * height * 4} bytes (${width}x${height}x4), got ${rgbaBytes.length} bytes`
		);
	}

	// Resize canvas
	canvas.width = width;
	canvas.height = height;

	// Convert RGBA bytes to ImageData and render directly
	const imageData = new ImageData(new Uint8ClampedArray(rgbaBytes), width, height);
	const ctx = canvas.getContext('2d');
	if (!ctx || !('putImageData' in ctx)) {
		throw new Error('Failed to get 2D canvas context');
	}

	ctx.putImageData(imageData, 0, 0);
}
