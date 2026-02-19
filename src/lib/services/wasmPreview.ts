import type { Project, SheetLayout, Stamp } from '$lib/types';
import { AVAILABLE_FONTS } from '$lib/types';
import { generateRecords } from '$lib/engine/data';

let wasmModule: typeof import('$lib/wasm/pdf_generator') | null = null;
let wasmInitialized = false;

// ---------------------------------------------------------------------------
// Template cache (blob → RGBA)
// ---------------------------------------------------------------------------
interface TemplateCache {
	blob: Blob;
	width: number;
	height: number;
	data: Uint8Array;
}
let templateCache: TemplateCache | null = null;

// ---------------------------------------------------------------------------
// Per-ticket cache. Key = JSON.stringify(record) – ONLY the value.
// Stores an ImageBitmap ready for fast canvas drawImage calls.
// ---------------------------------------------------------------------------
interface CachedTicket {
	bitmap: ImageBitmap;
	width: number; // bitmap width (= template width)
	height: number; // bitmap height (= template height)
}
const ticketCache = new Map<string, CachedTicket>();

// Hash of (stamps + template identity) – when this changes we flush ticketCache
let currentConfigHash: string | null = null;

// ---------------------------------------------------------------------------
// Viewport description passed in by the component on every frame
// ---------------------------------------------------------------------------
export interface Viewport {
	/** CSS-pixels-per-mm – drives the effective resolution */
	zoom: number;
	/** CSS-pixel offset of paper origin */
	panX: number;
	panY: number;
	/** CSS-pixel dimensions of the container (for clearing & culling) */
	cssWidth: number;
	cssHeight: number;
}

// ---------------------------------------------------------------------------
// Sheet geometry (computed once per layout change, reused across frames)
// ---------------------------------------------------------------------------
export interface SheetGeometry {
	paperWidthMm: number;
	paperHeightMm: number;
	ticketWidthMm: number;
	ticketHeightMm: number;
	marginLeftMm: number;
	marginTopMm: number;
	spacingXMm: number;
	spacingYMm: number;
	rows: number;
	cols: number;
	/** Serialised records for this page (simple key-value objects) */
	records: Record<string, string>[];
}

// ---------------------------------------------------------------------------
// WASM init
// ---------------------------------------------------------------------------
async function initWasm() {
	if (wasmInitialized && wasmModule) return wasmModule;
	const mod = await import('$lib/wasm/pdf_generator');
	await mod.default();
	wasmModule = mod;
	wasmInitialized = true;
	return mod;
}

// ---------------------------------------------------------------------------
// Blob → RGBA (cached)
// ---------------------------------------------------------------------------
async function blobToRgbaData(
	blob: Blob
): Promise<{ width: number; height: number; data: Uint8Array }> {
	if (templateCache && templateCache.blob === blob) {
		return {
			width: templateCache.width,
			height: templateCache.height,
			data: templateCache.data
		};
	}

	const result = await new Promise<{ width: number; height: number; data: Uint8Array }>(
		(resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				const c = new OffscreenCanvas(img.width, img.height);
				const ctx = c.getContext('2d');
				if (!ctx) {
					reject(new Error('Failed to get canvas context'));
					return;
				}
				ctx.drawImage(img, 0, 0);
				const id = ctx.getImageData(0, 0, img.width, img.height);
				resolve({
					width: img.width,
					height: img.height,
					data: new Uint8Array(id.data.buffer)
				});
			};
			img.onerror = () => reject(new Error('Failed to load image'));
			img.src = URL.createObjectURL(blob);
		}
	);

	templateCache = { blob, ...result };
	return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function serializeStamps(stamps: Stamp[]): unknown[] {
	return stamps.map((s) => s);
}

function getFontUrlsFromStamps(stamps: Stamp[]): Record<string, string> {
	const out: Record<string, string> = {};
	for (const s of stamps) {
		if (s.type === 'text') {
			const def = AVAILABLE_FONTS.find((f) => f.name === s.fontFamily);
			if (def && !out[s.fontFamily]) out[s.fontFamily] = def.url;
		}
	}
	if (Object.keys(out).length === 0) {
		const d = AVAILABLE_FONTS[0];
		out[d.name] = d.url;
	}
	return out;
}

// ---------------------------------------------------------------------------
// Compute sheet geometry from project + layout (pure, no side-effects)
// ---------------------------------------------------------------------------
export function computeSheetGeometry(project: Project, layout: SheetLayout): SheetGeometry {
	const paperWidthMm =
		layout.orientation === 'landscape' ? layout.paperSize.heightMm : layout.paperSize.widthMm;
	const paperHeightMm =
		layout.orientation === 'landscape' ? layout.paperSize.widthMm : layout.paperSize.heightMm;

	const ticketWidthMm =
		layout.cols > 0
			? (paperWidthMm -
					layout.marginLeft -
					layout.marginRight -
					(layout.cols - 1) * layout.spacingX) /
				layout.cols
			: 0;
	const ticketHeightMm =
		layout.rows > 0
			? (paperHeightMm -
					layout.marginTop -
					layout.marginBottom -
					(layout.rows - 1) * layout.spacingY) /
				layout.rows
			: 0;

	const records = generateRecords(project.dataSources);
	const ticketsPerPage = layout.rows * layout.cols;
	const serialized = records.slice(0, ticketsPerPage).map((r) => {
		const obj: Record<string, string> = {};
		for (const k in r) obj[k] = String(r[k]);
		return obj;
	});

	return {
		paperWidthMm,
		paperHeightMm,
		ticketWidthMm,
		ticketHeightMm,
		marginLeftMm: layout.marginLeft,
		marginTopMm: layout.marginTop,
		spacingXMm: layout.spacingX,
		spacingYMm: layout.spacingY,
		rows: layout.rows,
		cols: layout.cols,
		records: serialized
	};
}

// ---------------------------------------------------------------------------
// Render a single ticket via WASM (async). Returns an ImageBitmap.
// Cache key is ONLY JSON.stringify(record).
// ---------------------------------------------------------------------------
async function ensureTicketRendered(
	wasm: typeof import('$lib/wasm/pdf_generator'),
	templateData: { width: number; height: number; data: Uint8Array },
	stamps: Stamp[],
	record: Record<string, string>,
	fontsObject: Record<string, string>
): Promise<CachedTicket> {
	const key = JSON.stringify(record);
	const cached = ticketCache.get(key);
	if (cached) return cached;

	// We render at template pixel size (1:1). The DPI we pass to WASM is
	// calculated so that the paper dimensions in mm equal exactly the template
	// pixel dimensions. This keeps text/stamps at native template resolution.
	const MM_PER_INCH = 25.4;
	const templateWidthMm = templateData.width / (96 / MM_PER_INCH);
	const templateHeightMm = templateData.height / (96 / MM_PER_INCH);

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

	const dataLength = (await wasm.render_sheet(
		JSON.stringify(config),
		templateData.data,
		JSON.stringify(fontsObject)
	)) as number;

	const ptr = wasm.get_render_data_ptr();
	const mem = (wasm.get_memory() as WebAssembly.Memory).buffer;
	// Copy – WASM memory may be invalidated on next call
	const rgba = new Uint8Array(mem, ptr, dataLength).slice();

	// Build an ImageBitmap for fast repeated drawing
	const imageData = new ImageData(
		new Uint8ClampedArray(rgba.buffer),
		templateData.width,
		templateData.height
	);
	const bitmap = await createImageBitmap(imageData);

	const entry: CachedTicket = {
		bitmap,
		width: templateData.width,
		height: templateData.height
	};
	ticketCache.set(key, entry);
	return entry;
}

// ---------------------------------------------------------------------------
// Render visible tickets that aren't already cached (on-demand rendering)
// ---------------------------------------------------------------------------
async function renderVisibleTickets(
	project: Project,
	records: Record<string, string>[]
): Promise<void> {
	const wasm = await initWasm();
	if (!project.templateImage) throw new Error('No template image available');

	const templateData = await blobToRgbaData(project.templateImage);
	const fontsObject = getFontUrlsFromStamps(project.stamps);

	// Only render tickets that aren't already cached
	const toRender: Record<string, string>[] = [];
	for (const record of records) {
		const key = JSON.stringify(record);
		if (!ticketCache.has(key)) {
			toRender.push(record);
		}
	}

	// Render missing tickets
	for (const record of toRender) {
		await ensureTicketRendered(wasm, templateData, project.stamps, record, fontsObject);
	}
}

// ---------------------------------------------------------------------------
// Check for config changes and flush cache if needed.
// This is a lightweight pre-flight check that doesn't render anything.
// Returns true if cache was flushed.
// ---------------------------------------------------------------------------
export async function prepareTickets(project: Project): Promise<boolean> {
	await initWasm();

	if (!project.templateImage) throw new Error('No template image available');

	// Check for config change → flush ticket cache
	const configHash = JSON.stringify({
		stamps: serializeStamps(project.stamps),
		templateSize: project.templateImage.size,
		templateType: project.templateImage.type
	});
	if (currentConfigHash !== configHash) {
		clearTicketCache();
		currentConfigHash = configHash;
		return true;
	}

	return false;
}

// ---------------------------------------------------------------------------
// Compose visible tickets onto a canvas. This renders missing tickets
// on-demand and draws all visible cached tickets.
// ---------------------------------------------------------------------------
export async function composeSheet(
	canvas: HTMLCanvasElement,
	geo: SheetGeometry,
	viewport: Viewport,
	project: Project
): Promise<{ rendered: number; total: number }> {
	const ctx = canvas.getContext('2d', { alpha: false });
	if (!ctx) throw new Error('Failed to get 2D context');

	// Work in CSS pixel space (caller must have set ctx.setTransform(dpr,...) already)
	const cw = viewport.cssWidth;
	const ch = viewport.cssHeight;
	const { zoom, panX, panY } = viewport;

	// Clear to gray (container bg)
	ctx.fillStyle = '#f3f4f6'; // gray-100
	ctx.fillRect(0, 0, cw, ch);

	// Draw paper background (white rectangle with subtle shadow)
	const paperX = panX;
	const paperY = panY;
	const paperW = geo.paperWidthMm * zoom;
	const paperH = geo.paperHeightMm * zoom;

	// Shadow
	ctx.save();
	ctx.shadowColor = 'rgba(0,0,0,0.15)';
	ctx.shadowBlur = 12;
	ctx.shadowOffsetX = 2;
	ctx.shadowOffsetY = 2;
	ctx.fillStyle = 'white';
	ctx.fillRect(paperX, paperY, paperW, paperH);
	ctx.restore();

	// Ticket cell dimensions on canvas
	const cellW = geo.ticketWidthMm * zoom;
	const cellH = geo.ticketHeightMm * zoom;

	if (cellW <= 0 || cellH <= 0) return { rendered: 0, total: geo.records.length };

	let rendered = 0;
	const total = geo.records.length;

	// First pass: identify visible tickets that need rendering
	const visibleRecords: Record<string, string>[] = [];

	for (let i = 0; i < total; i++) {
		const row = Math.floor(i / geo.cols);
		const col = i % geo.cols;

		// Cell position in mm
		const cellMmX = geo.marginLeftMm + col * (geo.ticketWidthMm + geo.spacingXMm);
		const cellMmY = geo.marginTopMm + row * (geo.ticketHeightMm + geo.spacingYMm);

		// Cell position on canvas
		const cellCanvasX = cellMmX * zoom + panX;
		const cellCanvasY = cellMmY * zoom + panY;

		// Viewport culling – skip tickets entirely outside the canvas
		if (
			cellCanvasX + cellW < 0 ||
			cellCanvasY + cellH < 0 ||
			cellCanvasX > cw ||
			cellCanvasY > ch
		) {
			continue;
		}

		// This ticket is visible
		visibleRecords.push(geo.records[i]);
	}

	// Render any visible tickets that aren't cached yet
	if (visibleRecords.length > 0) {
		await renderVisibleTickets(project, visibleRecords);
	}

	// Second pass: draw all visible tickets (now all cached)
	for (let i = 0; i < total; i++) {
		const row = Math.floor(i / geo.cols);
		const col = i % geo.cols;

		// Cell position in mm
		const cellMmX = geo.marginLeftMm + col * (geo.ticketWidthMm + geo.spacingXMm);
		const cellMmY = geo.marginTopMm + row * (geo.ticketHeightMm + geo.spacingYMm);

		// Cell position on canvas
		const cellCanvasX = cellMmX * zoom + panX;
		const cellCanvasY = cellMmY * zoom + panY;

		// Viewport culling
		if (
			cellCanvasX + cellW < 0 ||
			cellCanvasY + cellH < 0 ||
			cellCanvasX > cw ||
			cellCanvasY > ch
		) {
			continue;
		}

		// Look up cached bitmap (should always exist now)
		const key = JSON.stringify(geo.records[i]);
		const cached = ticketCache.get(key);
		if (!cached) continue; // Skip if somehow not rendered

		// Uniform scaling: maintain template aspect ratio within cell
		const scaleX = cellW / cached.width;
		const scaleY = cellH / cached.height;
		const scale = Math.min(scaleX, scaleY);

		const drawW = cached.width * scale;
		const drawH = cached.height * scale;

		// Center within cell
		const drawX = cellCanvasX + (cellW - drawW) / 2;
		const drawY = cellCanvasY + (cellH - drawH) / 2;

		ctx.drawImage(cached.bitmap, drawX, drawY, drawW, drawH);
		rendered++;
	}

	return { rendered, total };
}

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------
export function clearTemplateCache(): void {
	templateCache = null;
	clearTicketCache();
}

export function clearTicketCache(): void {
	// Close ImageBitmaps to free GPU memory
	for (const entry of ticketCache.values()) {
		entry.bitmap.close();
	}
	ticketCache.clear();
	currentConfigHash = null;
}

export function clearAllCaches(): void {
	templateCache = null;
	clearTicketCache();
}

export function getCacheStats() {
	return {
		templateCached: templateCache !== null,
		ticketsCached: ticketCache.size,
		configHash: currentConfigHash ? currentConfigHash.substring(0, 20) + '…' : 'none'
	};
}
