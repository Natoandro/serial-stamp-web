import type { Project, SheetLayout, Stamp } from '$lib/types';
import { AVAILABLE_FONTS } from '$lib/types';
import { generateRecords } from '$lib/engine/data';

let wasmModule: typeof import('$lib/wasm/pdf_generator') | null = null;
let wasmInitialized = false;

// Cache for template RGBA data to avoid repeated conversions
interface TemplateCache {
	blob: Blob;
	width: number;
	height: number;
	data: Uint8Array;
}
let templateCache: TemplateCache | null = null;

// Cache for individual rendered tickets at template size
// Key: ONLY the record data - no layout parameters at all
// Tickets are always rendered at template size, then scaled during composition
interface TicketCache {
	data: Uint8Array; // RGBA bytes at template size
	width: number; // Template width
	height: number; // Template height
}
const ticketCache = new Map<string, TicketCache>();

// Track current configuration for cache invalidation
let currentConfigHash: string | null = null;

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
 * Convert template image blob to RGBA data for WASM (with caching)
 */
async function blobToRgbaData(
	blob: Blob
): Promise<{ width: number; height: number; data: Uint8Array }> {
	// Check cache first
	if (templateCache && templateCache.blob === blob) {
		return {
			width: templateCache.width,
			height: templateCache.height,
			data: templateCache.data
		};
	}

	// Convert blob to RGBA
	const result = await new Promise<{ width: number; height: number; data: Uint8Array }>(
		(resolve, reject) => {
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
		}
	);

	// Cache the result
	templateCache = {
		blob,
		width: result.width,
		height: result.height,
		data: result.data
	};

	return result;
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
 * Get font URLs map from text stamps
 */
function getFontUrlsFromStamps(stamps: Stamp[]): Record<string, string> {
	const fontsObject: Record<string, string> = {};
	for (const stamp of stamps) {
		if (stamp.type === 'text') {
			const fontDef = AVAILABLE_FONTS.find((f) => f.name === stamp.fontFamily);
			if (fontDef && !fontsObject[stamp.fontFamily]) {
				fontsObject[stamp.fontFamily] = fontDef.url;
			}
		}
	}
	// Ensure at least one font (default)
	if (Object.keys(fontsObject).length === 0) {
		const defaultFont = AVAILABLE_FONTS[0];
		fontsObject[defaultFont.name] = defaultFont.url;
	}
	return fontsObject;
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
		dpi: 96
	};

	// Calculate output dimensions BEFORE calling WASM
	// These must match exactly what WASM calculates
	const dpi = 96;
	const mmPerInch = 25.4;
	const pixelsPerMm = dpi / mmPerInch;
	const width = Math.round(paperWidth * pixelsPerMm);
	const height = Math.round(paperHeight * pixelsPerMm);

	// Get font URLs for WASM to fetch
	const fontsObject = getFontUrlsFromStamps(project.stamps);

	// Call WASM render function - pass template data and fonts URLs (returns Promise with data length)
	const configJson = JSON.stringify(config);
	const fontsJson = JSON.stringify(fontsObject);
	const dataLength = (await wasm.render_sheet(configJson, templateData.data, fontsJson)) as number;

	// Validate data length
	if (dataLength !== width * height * 4) {
		throw new Error(
			`WASM returned incorrect data size.\n` +
				`Expected: ${width * height * 4} bytes (${width}px × ${height}px × 4 channels)\n` +
				`Got: ${dataLength} bytes\n` +
				`Paper: ${paperWidth}mm × ${paperHeight}mm at ${dpi} DPI\n` +
				`This suggests a dimension calculation mismatch between TS and Rust.`
		);
	}

	// Access WASM memory directly (zero-copy)
	const ptr = wasm.get_render_data_ptr();
	const memoryBuffer = (wasm.get_memory() as WebAssembly.Memory).buffer;
	const memory = new Uint8Array(memoryBuffer, ptr, dataLength);

	// Convert RGBA bytes to ImageData
	const imageData = new ImageData(new Uint8ClampedArray(memory), width, height);

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
 * Render a single ticket with caching
 * Cache key is ONLY the record data - no layout parameters
 * Always renders at template size, scaling happens during composition
 */
async function renderTicket(
	wasm: typeof import('$lib/wasm/pdf_generator'),
	templateData: { width: number; height: number; data: Uint8Array },
	stamps: Stamp[],
	record: Record<string, string>,
	fontsObject: Record<string, string>
): Promise<{ data: Uint8Array; width: number; height: number }> {
	// Cache key is ONLY the record data - no dimensions, no layout
	const cacheKey = JSON.stringify(record);

	// Check cache
	const cached = ticketCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	// Render single ticket at template size
	// We render at template dimensions, then scale during composition
	const templateWidthMm = templateData.width / 3.7795275591; // Convert px to mm at 96 DPI
	const templateHeightMm = templateData.height / 3.7795275591;

	const config = {
		sheet_config: {
			paper_width_mm: templateWidthMm,
			paper_height_mm: templateHeightMm,
			rows: 1,
			cols: 1,
			margin_top_mm: 0,
			margin_right_mm: 0,
			margin_bottom_mm: 0,
			margin_left_mm: 0,
			spacing_x_mm: 0,
			spacing_y_mm: 0
		},
		template_width: templateData.width,
		template_height: templateData.height,
		stamps: serializeStamps(stamps),
		records: [record],
		dpi: 96
	};

	const configJson = JSON.stringify(config);
	const fontsJson = JSON.stringify(fontsObject);
	const dataLength = (await wasm.render_sheet(configJson, templateData.data, fontsJson)) as number;

	// Get rendered data
	const ptr = wasm.get_render_data_ptr();
	const memoryBuffer = (wasm.get_memory() as WebAssembly.Memory).buffer;
	const ticketData = new Uint8Array(memoryBuffer, ptr, dataLength).slice(); // Copy data

	// Cache it (at template size)
	const result = {
		data: ticketData,
		width: templateData.width,
		height: templateData.height
	};
	ticketCache.set(cacheKey, result);

	return result;
}

/**
 * Generate preview and render directly to a canvas element (optimized - no PNG encoding).
 * This is the FASTEST method for preview rendering with per-ticket caching.
 */
export async function renderWasmPreviewToCanvas(
	project: Project,
	layout: SheetLayout,
	canvas: HTMLCanvasElement
): Promise<void> {
	const perfStart = performance.now();
	const wasm = await initWasm();

	if (!project.templateImage) {
		throw new Error('No template image available');
	}

	// Generate config hash to detect when stamps/template change (invalidate cache)
	const configHash = JSON.stringify({
		stamps: serializeStamps(project.stamps),
		templateWidth: project.templateImage.size,
		templateType: project.templateImage.type
	});

	// If configuration changed, clear ticket cache
	if (currentConfigHash !== configHash) {
		console.log('[CACHE] Configuration changed, clearing ticket cache');
		ticketCache.clear();
		currentConfigHash = configHash;
	}

	// Convert template image to RGBA data
	const t1 = performance.now();
	const templateData = await blobToRgbaData(project.templateImage);
	console.log(`[PERF] Template conversion: ${(performance.now() - t1).toFixed(1)}ms`);

	// Generate records
	const t2 = performance.now();
	const records = generateRecords(project.dataSources);
	const ticketsPerPage = layout.rows * layout.cols;
	const recordsToRender = records.slice(0, ticketsPerPage);
	console.log(`[PERF] Generate records: ${(performance.now() - t2).toFixed(1)}ms`);

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

	// Calculate sheet and ticket dimensions
	const dpi = 96;
	const mmPerInch = 25.4;
	const pixelsPerMm = dpi / mmPerInch;
	const sheetWidth = Math.round(paperWidth * pixelsPerMm);
	const sheetHeight = Math.round(paperHeight * pixelsPerMm);

	// Calculate ticket size in mm
	const ticketWidthMm =
		layout.cols > 0
			? (paperWidth -
					layout.marginLeft -
					layout.marginRight -
					(layout.cols - 1) * layout.spacingX) /
				layout.cols
			: 0;
	const ticketHeightMm =
		layout.rows > 0
			? (paperHeight -
					layout.marginTop -
					layout.marginBottom -
					(layout.rows - 1) * layout.spacingY) /
				layout.rows
			: 0;

	const ticketWidth = Math.round(ticketWidthMm * pixelsPerMm);
	const ticketHeight = Math.round(ticketHeightMm * pixelsPerMm);

	// Get font URLs
	const fontsObject = getFontUrlsFromStamps(project.stamps);

	// Render individual tickets with caching (at template size)
	const t3 = performance.now();
	const tickets: Array<{ data: Uint8Array; width: number; height: number }> = [];
	let cacheHits = 0;
	let cacheMisses = 0;

	for (const record of serializedRecords) {
		const cacheKey = JSON.stringify(record);
		const wasInCache = ticketCache.has(cacheKey);

		const ticket = await renderTicket(wasm, templateData, project.stamps, record, fontsObject);
		tickets.push(ticket);

		if (wasInCache) {
			cacheHits++;
		} else {
			cacheMisses++;
		}
	}
	console.log(
		`[PERF] Render ${tickets.length} tickets: ${(performance.now() - t3).toFixed(1)}ms ` +
			`(${cacheHits} cache hits, ${cacheMisses} misses)`
	);

	// Compose tickets onto sheet
	const t4 = performance.now();
	canvas.width = sheetWidth;
	canvas.height = sheetHeight;

	const ctx = canvas.getContext('2d', { alpha: false });
	if (!ctx) {
		throw new Error('Failed to get 2D canvas context');
	}

	// Fill white background
	ctx.fillStyle = 'white';
	ctx.fillRect(0, 0, sheetWidth, sheetHeight);

	// Convert margins and spacing to pixels
	const marginLeft = Math.round(layout.marginLeft * pixelsPerMm);
	const marginTop = Math.round(layout.marginTop * pixelsPerMm);
	const spacingX = Math.round(layout.spacingX * pixelsPerMm);
	const spacingY = Math.round(layout.spacingY * pixelsPerMm);

	// Composite each ticket (scale from template size to target size)
	for (let i = 0; i < tickets.length; i++) {
		const row = Math.floor(i / layout.cols);
		const col = i % layout.cols;

		const x = marginLeft + col * (ticketWidth + spacingX);
		const y = marginTop + row * (ticketHeight + spacingY);

		const ticket = tickets[i];

		// Calculate UNIFORM scale factor (same for both axes)
		const scaleX = ticketWidth / ticket.width;
		const scaleY = ticketHeight / ticket.height;
		const scale = Math.min(scaleX, scaleY); // Maintain aspect ratio

		const scaledWidth = Math.round(ticket.width * scale);
		const scaledHeight = Math.round(ticket.height * scale);

		// Center the scaled ticket within the grid cell
		const offsetX = Math.round((ticketWidth - scaledWidth) / 2);
		const offsetY = Math.round((ticketHeight - scaledHeight) / 2);

		// Create a temporary canvas for scaling
		const tempCanvas = new OffscreenCanvas(ticket.width, ticket.height);
		const tempCtx = tempCanvas.getContext('2d');
		if (!tempCtx) continue;

		// Put the cached ticket data on temp canvas
		const ticketImageData = new ImageData(
			new Uint8ClampedArray(ticket.data),
			ticket.width,
			ticket.height
		);
		tempCtx.putImageData(ticketImageData, 0, 0);

		// Draw scaled to target position with uniform scaling and centering
		ctx.drawImage(tempCanvas, x + offsetX, y + offsetY, scaledWidth, scaledHeight);
	}
	console.log(`[PERF] Compose tickets: ${(performance.now() - t4).toFixed(1)}ms`);
	console.log(`[PERF] TOTAL: ${(performance.now() - perfStart).toFixed(1)}ms`);
}

/**
 * Clear the template cache (call when template image changes)
 */
export function clearTemplateCache(): void {
	templateCache = null;
	clearTicketCache();
}

/**
 * Clear the ticket cache (call when stamps or template change)
 * Note: Layout changes (margins, spacing) don't require cache clearing - tickets are recomposed
 */
export function clearTicketCache(): void {
	ticketCache.clear();
	currentConfigHash = null;
	console.log('[CACHE] Ticket cache cleared');
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
	templateCache = null;
	ticketCache.clear();
	currentConfigHash = null;
	console.log('[CACHE] All caches cleared');
}

/**
 * Get cache statistics for debugging and monitoring
 */
export function getCacheStats() {
	return {
		templateCached: templateCache !== null,
		ticketsCached: ticketCache.size,
		estimatedMemoryKB: Math.round(
			(ticketCache.size > 0
				? Array.from(ticketCache.values()).reduce((sum, ticket) => sum + ticket.data.byteLength, 0)
				: 0) / 1024
		),
		configHash: currentConfigHash?.substring(0, 16) + '...' || 'none'
	};
}
