# Serial Stamp — Implementation Plan

## Overview

This document outlines the implementation plan for **Serial Stamp**, a SvelteKit app for generating print-ready sheets of serialized tickets with stamps (text, barcodes, QR codes). The app uses IndexedDB for client-side storage, canvas for preview rendering, and Rust/WASM for PDF generation.

**Current State**: Fresh SvelteKit scaffold with Tailwind CSS v4, Svelte 5, and static adapter. No dependencies installed yet.

---

## Phase 0: Foundation (Data Layer & Routing Shell)

**Goal**: Establish the data model, database layer, and basic routing structure.

### 0.1 — Install Core Dependencies

```bash
pnpm add dexie uuid
pnpm add -D @types/uuid
```

### 0.2 — Define TypeScript Domain Types

Create `src/lib/types.ts` with the core data model:

#### Core Types

**Project**

- `id: string` (UUID)
- `name: string`
- `templateImage: Blob`
- `stamps: Stamp[]`
- `dataSources: DataSource[]`
- `sheetLayout?: SheetLayout`
- `createdAt: Date`
- `updatedAt: Date`

**Stamp** (discriminated union)

- `type: 'text' | 'barcode' | 'qrcode'`
- `id: string` (UUID)
- `x: number` (position in template image pixels)
- `y: number`
- `width: number`
- `height: number`

**TextStamp** extends `Stamp`

- `type: 'text'`
- `template: string` (e.g., `"{{number}}"`)
- `fontFamily: string`
- `fontSize: number`
- `color: string`
- `alignment: 'left' | 'center' | 'right'`

**BarcodeStamp** extends `Stamp`

- `type: 'barcode'`
- `template: string`
- `format: BarcodeFormat` (Code128, Code39, EAN-13, etc.)

**QrCodeStamp** extends `Stamp`

- `type: 'qrcode'`
- `template: string`
- `errorCorrection: 'L' | 'M' | 'Q' | 'H'`
- `moduleSize: number`

**DataSource** (discriminated union)

- `type: 'csv' | 'sequential' | 'random'`
- `id: string` (UUID)

**CsvDataSource** extends `DataSource`

- `type: 'csv'`
- `columns: string[]`
- `rows: Record<string, string>[]`

**SequentialDataSource** extends `DataSource`

- `type: 'sequential'`
- `prefix?: string`
- `start: number`
- `end: number`
- `step: number`
- `padLength: number`

**RandomDataSource** extends `DataSource`

- `type: 'random'`
- `charset: string`
- `length: number`
- `count: number`

**SheetLayout**

- `paperSize: PaperSize`
- `rows: number`
- `cols: number`
- `marginTop: number` (mm)
- `marginRight: number` (mm)
- `marginBottom: number` (mm)
- `marginLeft: number` (mm)
- `spacingX: number` (mm)
- `spacingY: number` (mm)

**PaperSize**

- `name: string` (e.g., "A4", "Letter", "Custom")
- `widthMm: number`
- `heightMm: number`

Standard presets: A4 (210×297), A3 (297×420), Letter (215.9×279.4), Custom (user-defined).

### 0.3 — Set Up Dexie Database

Create `src/lib/db.ts`:

```typescript
import Dexie, { type Table } from 'dexie';
import type { Project } from './types';

export class SerialStampDatabase extends Dexie {
	projects!: Table<Project, string>;

	constructor() {
		super('SerialStampDB');
		this.version(1).stores({
			projects: 'id, createdAt'
		});
	}
}

export const db = new SerialStampDatabase();
```

- Primary key: `id` (managed manually as UUID).
- Index on `createdAt` for sorting projects by creation date.
- Store full `Project` object as document (no relational joins needed).

### 0.4 — Create Data Access Layer

Create `src/lib/data/projects.ts`:

```typescript
import { db } from '$lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { Project } from '$lib/types';

export async function createProject(
	data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Project> {
	const now = new Date();
	const project: Project = {
		...data,
		id: uuidv4(),
		createdAt: now,
		updatedAt: now
	};
	await db.projects.add(project);
	return project;
}

export async function getProject(id: string): Promise<Project | undefined> {
	return await db.projects.get(id);
}

export async function listProjects(): Promise<Project[]> {
	return await db.projects.orderBy('createdAt').reverse().toArray();
}

export async function updateProject(
	id: string,
	patch: Partial<Omit<Project, 'id' | 'createdAt'>>
): Promise<void> {
	await db.projects.update(id, { ...patch, updatedAt: new Date() });
}

export async function deleteProject(id: string): Promise<void> {
	await db.projects.delete(id);
}
```

These functions are the only place that touches the database directly.

### 0.5 — Set Up Routing Shell

```
src/routes/
  +layout.svelte              # app shell (nav bar, optional sidebar)
  +page.svelte                # home / project list
  projects/
    new/
      +page.svelte            # project creation wizard
    [projectId]/
      +page.svelte            # ticket editor (stamps + preview)
      sheet/
        +page.svelte          # sheet layout editor + preview
```

- All data loading happens client-side (no `+page.server.ts` needed).
- Use `$page.params.projectId` to fetch from IndexedDB on component mount.

### 0.6 — Home Page (Project List)

`src/routes/+page.svelte`:

**Features**:

- Grid/list of existing projects.
- Display: project name, thumbnail (rendered from template image), created date.
- "New Project" button → navigates to `/projects/new`.
- Click on project → navigates to `/projects/[projectId]`.
- Delete button with confirmation dialog.

**Implementation**:

- On mount, call `listProjects()`.
- Store in component state using `$state`.
- Render thumbnails using `<img>` with blob URLs from `templateImage`.

---

## Phase 1: Project Creation Wizard

**Goal**: Guide users through multi-step project setup (name, image, data sources, stamps).

### 1.1 — Wizard Framework Component

Create `src/lib/components/wizard/Wizard.svelte`:

**Props**:

- `steps: { label: string, component: ComponentType, validate?: () => boolean }[]`

**State**:

- `currentStep: number` (using `$state`)
- `formData: Record<string, any>` (shared across steps)

**UI**:

- Step indicator (stepper/breadcrumb bar).
- Next/Back/Finish buttons.
- Validate current step before allowing forward navigation.
- On "Finish", emit event or call callback with collected data.

### 1.2 — Step 1: Project Name & Template Image

`src/lib/components/wizard/StepNameAndImage.svelte`:

**Inputs**:

- Text input for project name (required).
- File input for template image (accept `image/*`, required).

**Preview**:

- Display uploaded image preview using `<img>`.

**Validation**:

- Name must not be empty.
- Image file must be selected.

**Output**:

- `{ name: string, templateImage: Blob }`

### 1.3 — Step 2: Data Sources

`src/lib/components/wizard/StepDataSources.svelte`:

**UI**:

- Tabs or radio buttons to select data source type (CSV / Sequential / Random).
- Allow adding multiple data sources (optional, start with single source).

**CSV Source**:

- File upload (accept `.csv`).
- Parse with PapaParse (install in Phase 4).
- Show preview table.
- Extract column names as available template variables.

**Sequential Source**:

- Inputs:
  - Start number (default: 1)
  - End number (required)
  - Step (default: 1)
  - Padding length (default: 0, e.g., 3 → `001`)
  - Prefix (optional, e.g., `"TICKET-"`)

**Random Source**:

- Inputs:
  - Charset (dropdown: alphanumeric, numeric, alpha, custom)
  - Length (default: 8)
  - Count (number of random strings to generate)

**Validation**:

- At least one data source must be configured.

**Output**:

- `{ dataSources: DataSource[] }`

### 1.4 — Step 3: Stamps (Simplified Editor)

`src/lib/components/wizard/StepStamps.svelte`:

**UI**:

- "Add Stamp" button (dropdown: Text / Barcode / QR Code).
- List of added stamps (name, type, position).
- Side panel for editing selected stamp.
- Canvas preview of ticket with stamps overlaid (see Phase 2 for rendering).

**Drag-and-Drop**:

- Use Phase 2's canvas interaction for positioning.
- Allow basic resize handles.

**Validation**:

- No validation required (stamps are optional).

**Output**:

- `{ stamps: Stamp[] }`

### 1.5 — Wizard Completion

On "Finish":

1. Assemble full `Project` object from wizard `formData`.
2. Call `createProject()` to persist to IndexedDB.
3. Navigate to `/projects/[projectId]`.

---

## Phase 2: Ticket Editor (Single Ticket View)

**Goal**: Interactive editor for positioning and styling stamps on a single ticket.

### 2.1 — Canvas Rendering Engine

Create `src/lib/canvas/TicketRenderer.ts`:

**Class**: `TicketRenderer`

**Constructor**:

- Accepts `CanvasRenderingContext2D`, template image (`ImageBitmap`), stamps, DPI scale factor.

**Methods**:

- `render(record: Record<string, string>): void`
  - Clear canvas.
  - Draw template image.
  - For each stamp:
    - **Text stamps**: resolve template variables, draw text with configured font/size/color.
    - **Barcode stamps**: generate barcode (Phase 3), draw to canvas.
    - **QR code stamps**: generate QR code (Phase 3), draw to canvas.
- `getImageData(): ImageData` — returns rendered pixels for PDF export.

**Template Variable Resolution**:

- Replace `{{key}}` in stamp templates with `record[key]`.
- Fallback to empty string for missing keys.

### 2.2 — Preview Component

Create `src/lib/components/editor/TicketPreview.svelte`:

**Props**:

- `project: Project`
- `selectedRecord: Record<string, string>` (current data record to preview)
- `selectedStampId?: string` (highlight selected stamp)

**Features**:

- `<canvas>` element bound via `bind:this`.
- Re-render on changes to stamps, template image, or selected record (use `$effect`).
- Handle canvas sizing and DPI scaling for crisp display.
- Record selector (dropdown or slider) to cycle through data records.

### 2.3 — Stamp List Panel

Create `src/lib/components/editor/StampPanel.svelte`:

**UI**:

- List all stamps with:
  - Type icon (text/barcode/QR).
  - Preview of rendered stamp (small thumbnail).
  - Edit button → opens property editor.
  - Delete button → removes stamp.
- "Add Stamp" button (dropdown menu).

**State**:

- Selected stamp ID (using `$state`).

### 2.4 — Stamp Property Editors

Create per-type stamp editors:

#### `src/lib/components/editor/TextStampEditor.svelte`

**Inputs**:

- Template text (textarea with variable picker).
- Font family (dropdown: web-safe fonts like Arial, Helvetica, Times New Roman, Courier).
- Font size (number input, px or pt).
- Color (color picker).
- Alignment (left / center / right).

#### `src/lib/components/editor/BarcodeStampEditor.svelte`

**Inputs**:

- Data template (text input with variable picker).
- Barcode format (dropdown: Code128, Code39, EAN-13, UPC-A, etc.).

#### `src/lib/components/editor/QrCodeStampEditor.svelte`

**Inputs**:

- Data template (text input with variable picker).
- Error correction level (dropdown: L, M, Q, H).
- Module size (number input, px).

### 2.5 — Drag-and-Drop Stamp Positioning

**Location**: Add to `TicketPreview.svelte` or create `src/lib/canvas/interaction.ts`.

**Features**:

- Mouse/touch event handlers on canvas:
  - **Click**: select stamp (show bounding box + resize handles).
  - **Drag**: move stamp position (`x`, `y`).
  - **Resize handles**: change stamp `width`/`height`.

**Coordinate System**:

- Store positions in **template image pixels** (not screen pixels).
- Convert between screen coordinates and image coordinates based on canvas display scale.

**Persistence**:

- Update stamp positions in component state (`$state`).
- Debounce saves to IndexedDB (e.g., 500ms after last change).

### 2.6 — Template Variable Resolution

Create `src/lib/engine/template.ts`:

```typescript
export function resolveTemplate(template: string, record: Record<string, string>): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_, key) => record[key] || '');
}

export function extractVariables(template: string): string[] {
	const matches = template.matchAll(/\{\{(\w+)\}\}/g);
	return Array.from(matches, (m) => m[1]);
}

export function getAvailableVariables(dataSources: DataSource[]): string[] {
	const vars = new Set<string>();
	for (const source of dataSources) {
		if (source.type === 'csv') {
			source.columns.forEach((col) => vars.add(col));
		} else if (source.type === 'sequential') {
			vars.add('number');
		} else if (source.type === 'random') {
			vars.add('random');
		}
	}
	return Array.from(vars);
}
```

---

## Phase 3: Barcode & QR Code Generation

**Goal**: Generate barcode and QR code images for stamp rendering.

### 3.1 — Install Dependencies

```bash
pnpm add bwip-js qrcode
pnpm add -D @types/qrcode
```

- **`bwip-js`**: Client-side barcode generation (supports 100+ symbologies).
- **`qrcode`**: QR code generation with canvas/data URL output.

### 3.2 — Barcode Rendering Service

Create `src/lib/engine/barcode.ts`:

```typescript
import bwipjs from 'bwip-js';

export type BarcodeFormat = 'code128' | 'code39' | 'ean13' | 'upca' | 'qrcode';

export async function generateBarcode(
	data: string,
	format: BarcodeFormat,
	width: number,
	height: number
): Promise<ImageBitmap> {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	bwipjs.toCanvas(canvas, {
		bcid: format,
		text: data,
		width: width / 10, // bwip-js uses mm
		height: height / 10,
		includetext: false
	});

	return await createImageBitmap(canvas);
}
```

### 3.3 — QR Code Rendering Service

Create `src/lib/engine/qrcode.ts`:

```typescript
import QRCode from 'qrcode';

export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export interface QrOptions {
	errorCorrectionLevel: QrErrorCorrection;
	width: number;
}

export async function generateQrCode(data: string, options: QrOptions): Promise<ImageBitmap> {
	const canvas = document.createElement('canvas');
	await QRCode.toCanvas(canvas, data, {
		errorCorrectionLevel: options.errorCorrectionLevel,
		width: options.width
	});

	return await createImageBitmap(canvas);
}
```

---

## Phase 4: Data Source Engine

**Goal**: Generate data records from configured data sources.

### 4.1 — Data Record Generation

Create `src/lib/engine/datasource.ts`:

```typescript
import type { DataSource, CsvDataSource, SequentialDataSource, RandomDataSource } from '$lib/types';

export function generateRecords(sources: DataSource[]): Record<string, string>[] {
	if (sources.length === 0) return [{}];

	// Start with single source support
	const source = sources[0];

	switch (source.type) {
		case 'csv':
			return generateCsvRecords(source);
		case 'sequential':
			return generateSequentialRecords(source);
		case 'random':
			return generateRandomRecords(source);
	}
}

function generateCsvRecords(source: CsvDataSource): Record<string, string>[] {
	return source.rows;
}

function generateSequentialRecords(source: SequentialDataSource): Record<string, string>[] {
	const records: Record<string, string>[] = [];
	for (let i = source.start; i <= source.end; i += source.step) {
		const num = i.toString().padStart(source.padLength, '0');
		const value = source.prefix ? `${source.prefix}${num}` : num;
		records.push({ number: value });
	}
	return records;
}

function generateRandomRecords(source: RandomDataSource): Record<string, string>[] {
	const records: Record<string, string>[] = [];
	for (let i = 0; i < source.count; i++) {
		let value = '';
		for (let j = 0; j < source.length; j++) {
			value += source.charset[Math.floor(Math.random() * source.charset.length)];
		}
		records.push({ random: value });
	}
	return records;
}
```

**Future Enhancement**: Support multiple data sources with combination strategies (zip vs. cartesian product).

### 4.2 — CSV Parser Integration

```bash
pnpm add papaparse
pnpm add -D @types/papaparse
```

Create `src/lib/engine/csv.ts`:

```typescript
import Papa from 'papaparse';
import type { CsvDataSource } from '$lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function parseCsv(file: File): Promise<CsvDataSource> {
	return new Promise((resolve, reject) => {
		Papa.parse(file, {
			header: true,
			skipEmptyLines: true,
			complete: (results) => {
				const rows = results.data as Record<string, string>[];
				const columns = results.meta.fields || [];

				resolve({
					id: uuidv4(),
					type: 'csv',
					columns,
					rows
				});
			},
			error: (error) => reject(error)
		});
	});
}
```

---

## Phase 5: Sheet Layout Editor

**Goal**: Configure and preview multi-ticket sheet layout.

### 5.1 — Sheet Layout Configuration UI

`src/routes/projects/[projectId]/sheet/+page.svelte`:

**Inputs**:

- **Paper size selector**: Dropdown (A4, A3, Letter) + "Custom" with width/height inputs (mm).
- **Grid configuration**: Rows (number), Columns (number).
- **Margins**: Top, Right, Bottom, Left (mm).
- **Spacing**: Inner spacing X (horizontal gap), Y (vertical gap) between tickets (mm).

**Validation & Preview**:

- Calculate whether tickets fit:
  ```
  ticketWidth = (paperWidth - marginLeft - marginRight - (cols - 1) * spacingX) / cols
  ticketHeight = (paperHeight - marginTop - marginBottom - (rows - 1) * spacingY) / rows
  ```
- Show warnings if tickets would be clipped or require scaling.
- Display calculated ticket dimensions.

**Save**:

- Update `project.sheetLayout` in IndexedDB.

### 5.2 — Sheet Preview Canvas

Create `src/lib/components/editor/SheetPreview.svelte`:

**Features**:

- Render full sheet at scaled-down size (fit to screen).
- Draw:
  1. Paper outline (border).
  2. Margins (light gray background or guides).
  3. Grid of tickets (each cell renders using `TicketRenderer`).
  4. Spacing between tickets (visual guides/grid lines).

**Data Mapping**:

- Map data records to cells sequentially (left-to-right, top-to-bottom).
- Total tickets per sheet: `rows * cols`.
- If `records.length > rows * cols`, support multi-page preview (pagination controls).

**Zoom/Pan** (optional):

- Allow zooming in/out and panning for large sheets.

### 5.3 — Sheet Data Mapping

Create `src/lib/canvas/SheetRenderer.ts`:

```typescript
export class SheetRenderer {
	constructor(
		private ctx: CanvasRenderingContext2D,
		private sheetLayout: SheetLayout,
		private ticketRenderer: TicketRenderer,
		private records: Record<string, string>[]
	) {}

	render(pageIndex: number = 0): void {
		const { rows, cols } = this.sheetLayout;
		const ticketsPerPage = rows * cols;
		const startIdx = pageIndex * ticketsPerPage;

		// Clear canvas and draw paper background
		// Draw margin guides
		// For each cell (row, col):
		//   - Calculate position (x, y) in mm → pixels
		//   - Get corresponding record: records[startIdx + row * cols + col]
		//   - Render ticket at position using ticketRenderer
	}

	getTotalPages(): number {
		const ticketsPerPage = this.sheetLayout.rows * this.sheetLayout.cols;
		return Math.ceil(this.records.length / ticketsPerPage);
	}
}
```

---

## Phase 6: PDF Export (Rust/WASM)

**Goal**: Generate high-resolution, print-ready PDFs using Rust and WebAssembly.

### 6.1 — Rust WASM Crate Setup

Create a new Rust crate in the repo:

```
crates/
  pdf-gen/
    Cargo.toml
    src/
      lib.rs
```

**`Cargo.toml`**:

```toml
[package]
name = "pdf-gen"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
printpdf = "0.7"
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

**Build Tool**: Use `wasm-pack` for compilation.

```bash
# Install wasm-pack globally
cargo install wasm-pack
```

### 6.2 — PDF Generation Logic (Rust)

`src/lib.rs`:

```rust
use wasm_bindgen::prelude::*;
use printpdf::*;
use serde::Deserialize;

#[derive(Deserialize)]
struct SheetConfig {
    paper_width_mm: f32,
    paper_height_mm: f32,
    rows: u32,
    cols: u32,
    margin_top_mm: f32,
    margin_right_mm: f32,
    margin_bottom_mm: f32,
    margin_left_mm: f32,
    spacing_x_mm: f32,
    spacing_y_mm: f32,
}

#[wasm_bindgen]
pub fn generate_pdf(
    config_json: &str,
    ticket_images: &[u8],  // Raw RGBA pixel data concatenated
    ticket_width: u32,
    ticket_height: u32,
    ticket_count: u32,
    dpi: u32,
) -> Vec<u8> {
    let config: SheetConfig = serde_json::from_str(config_json).unwrap();

    // Convert mm to pt (1mm = 2.8346pt)
    let page_width_pt = Mm(config.paper_width_mm).into();
    let page_height_pt = Mm(config.paper_height_mm).into();

    let (doc, page1, layer1) = PdfDocument::new(
        "Serial Stamp Sheet",
        page_width_pt,
        page_height_pt,
        "Layer 1",
    );

    // Calculate positions and place ticket images
    // For each row/col:
    //   - Calculate position in pt
    //   - Extract ticket image from ticket_images array
    //   - Add image to PDF at calculated position with correct DPI scaling

    // Save PDF to Vec<u8>
    let mut buffer = Vec::new();
    doc.save(&mut buffer).unwrap();
    buffer
}
```

**Notes**:

- Handle DPI scaling: pixels → mm conversion based on target DPI (e.g., 300 DPI).
- Image data format: assume raw RGBA bytes, convert to printpdf's image format.

### 6.3 — WASM Build Pipeline

Add build script to `package.json`:

```json
{
	"scripts": {
		"build:wasm": "cd crates/pdf-gen && wasm-pack build --target web --out-dir ../../src/lib/wasm/pdf-gen"
	}
}
```

**Output**: WASM module and JS bindings in `src/lib/wasm/pdf-gen/`.

**Gitignore**: Add `src/lib/wasm/` to `.gitignore` (or commit if CI doesn't rebuild WASM).

### 6.4 — Export UI & Orchestration

Create `src/lib/engine/export.ts`:

```typescript
import { generateRecords } from './datasource';
import { TicketRenderer } from '$lib/canvas/TicketRenderer';
import type { Project } from '$lib/types';

export async function exportPdf(project: Project, dpi: number = 300): Promise<Blob> {
	// 1. Load WASM module
	const { generate_pdf } = await import('$lib/wasm/pdf-gen/pdf_gen');

	// 2. Generate all data records
	const records = generateRecords(project.dataSources);

	// 3. Render each ticket to offscreen canvas at target DPI
	const ticketImages: Uint8Array[] = [];
	const templateImage = await createImageBitmap(project.templateImage);

	const offscreen = new OffscreenCanvas(ticketWidth, ticketHeight);
	const ctx = offscreen.getContext('2d')!;
	const renderer = new TicketRenderer(ctx, templateImage, project.stamps, dpi / 96);

	for (const record of records) {
		renderer.render(record);
		const imageData = ctx.getImageData(0, 0, ticketWidth, ticketHeight);
		ticketImages.push(new Uint8Array(imageData.data.buffer));
	}

	// 4. Concatenate ticket images
	const totalBytes = ticketImages.reduce((sum, img) => sum + img.length, 0);
	const concatenated = new Uint8Array(totalBytes);
	let offset = 0;
	for (const img of ticketImages) {
		concatenated.set(img, offset);
		offset += img.length;
	}

	// 5. Call WASM function
	const config = JSON.stringify({
		paper_width_mm: project.sheetLayout!.paperSize.widthMm,
		paper_height_mm: project.sheetLayout!.paperSize.heightMm,
		rows: project.sheetLayout!.rows,
		cols: project.sheetLayout!.cols,
		margin_top_mm: project.sheetLayout!.marginTop,
		margin_right_mm: project.sheetLayout!.marginRight,
		margin_bottom_mm: project.sheetLayout!.marginBottom,
		margin_left_mm: project.sheetLayout!.marginLeft,
		spacing_x_mm: project.sheetLayout!.spacingX,
		spacing_y_mm: project.sheetLayout!.spacingY
	});

	const pdfBytes = generate_pdf(
		config,
		concatenated,
		ticketWidth,
		ticketHeight,
		records.length,
		dpi
	);

	// 6. Return as Blob
	return new Blob([pdfBytes], { type: 'application/pdf' });
}
```

**Export Button Component**:

`src/lib/components/editor/ExportButton.svelte`:

**Features**:

- DPI selector (150 / 300 / 600).
- Progress indicator (rendering X of N tickets…).
- Trigger download on completion.

**Implementation**:

- Call `exportPdf()`.
- Use `URL.createObjectURL()` to trigger download.
- Optionally use Web Worker to avoid blocking UI during rendering.

---

## Phase 7: Polish & UX

**Goal**: Error handling, validation, responsive layout, and optional enhancements.

### 7.1 — Error Handling & Validation

- **Form validation**: Required fields, numeric ranges, file formats.
- **IndexedDB errors**: Handle quota exceeded, private browsing mode.
- **Image upload**: Max file size (e.g., 10MB), format check (PNG/JPEG only).
- **User feedback**: Toast notifications for success/error messages.

### 7.2 — Responsive Layout

- **Desktop-first**: Primary use case is precision editing on large screens.
- **Mobile support**: Ensure project list and basic navigation work on tablets/phones.
- **Editor layout**:
  - Side panel (stamp list + property editors).
  - Main area (canvas preview).
  - Collapsible panels for small screens.

### 7.3 — Undo/Redo (Stretch Goal)

**Implementation**:

- Maintain a command stack (array of state snapshots or deltas).
- Keyboard shortcuts: `Ctrl+Z` (undo), `Ctrl+Shift+Z` (redo).
- Limit stack size (e.g., last 50 actions).

### 7.4 — Project Import/Export (Stretch Goal)

**Export**:

- Serialize project to JSON.
- Encode `templateImage` as base64.
- Trigger download as `.json` file.

**Import**:

- File upload (accept `.json`).
- Parse and validate schema.
- Decode base64 image, create new project in IndexedDB.

---

## Dependency Summary

| Package                  | Purpose             | Phase |
| ------------------------ | ------------------- | ----- |
| `dexie`                  | IndexedDB wrapper   | 0     |
| `uuid`                   | UUID generation     | 0     |
| `papaparse`              | CSV parsing         | 4     |
| `bwip-js`                | Barcode generation  | 3     |
| `qrcode`                 | QR code generation  | 3     |
| `wasm-pack` (build tool) | Compile Rust → WASM | 6     |
| `printpdf` (Rust crate)  | PDF generation      | 6     |

---

## File Structure (End State)

```
serial-stamp/
  crates/
    pdf-gen/
      Cargo.toml
      src/
        lib.rs
  src/
    lib/
      types.ts                      # TypeScript domain types
      db.ts                         # Dexie database setup
      data/
        projects.ts                 # Project CRUD operations
      engine/
        template.ts                 # {{variable}} resolution
        datasource.ts               # Data record generation
        csv.ts                      # CSV parsing
        barcode.ts                  # Barcode image generation
        qrcode.ts                   # QR code image generation
        export.ts                   # PDF export orchestration
      canvas/
        TicketRenderer.ts           # Single-ticket canvas rendering
        SheetRenderer.ts            # Full-sheet canvas rendering
        interaction.ts              # Drag/drop/resize event handling
      wasm/
        pdf-gen/                    # WASM output (generated)
      components/
        wizard/
          Wizard.svelte
          StepNameAndImage.svelte
          StepDataSources.svelte
          StepStamps.svelte
        editor/
          TicketPreview.svelte
          SheetPreview.svelte
          StampPanel.svelte
          TextStampEditor.svelte
          BarcodeStampEditor.svelte
          QrCodeStampEditor.svelte
          ExportButton.svelte
        ui/
          Button.svelte
          Input.svelte
          Modal.svelte
    routes/
      +layout.svelte
      +page.svelte                  # Home / project list
      projects/
        new/
          +page.svelte              # Creation wizard
        [projectId]/
          +page.svelte              # Ticket editor
          sheet/
            +page.svelte            # Sheet layout editor
  package.json
  svelte.config.js
  vite.config.ts
  tsconfig.json
  IMPLEMENTATION_PLAN.md            # This file
  project-archi-overview.md
  agent.md
```

---

## Recommended Implementation Order

| Order | Phase                   | Estimated Effort | Deliverable                           |
| ----- | ----------------------- | ---------------- | ------------------------------------- |
| 1     | **Phase 0**             | ~1 day           | Types, DB, routing, project list page |
| 2     | **Phase 1 (Steps 1-2)** | ~1 day           | Wizard: name, image, data sources     |
| 3     | **Phase 2.1-2.3**       | ~2 days          | Canvas rendering + text stamps        |
| 4     | **Phase 2.5**           | ~1 day           | Drag-and-drop positioning             |
| 5     | **Phase 4**             | ~1 day           | Data source engine, record generation |
| 6     | **Phase 3**             | ~1 day           | Barcode & QR code generation          |
| 7     | **Phase 1.4**           | ~0.5 day         | Wizard: stamp setup (Step 3)          |
| 8     | **Phase 5**             | ~1.5 days        | Sheet layout editor + preview         |
| 9     | **Phase 6**             | ~2-3 days        | Rust/WASM PDF export                  |
| 10    | **Phase 7**             | Ongoing          | Validation, error handling, polish    |

**Total estimate**: ~11-13 working days for a functional MVP.

---

## Next Steps

1. **Start with Phase 0**: Establish data model, database, and routing.
2. **Iterate on Phase 1-2**: Build the wizard and ticket editor core.
3. **Add barcode/QR support (Phase 3)** once text stamps are working.
4. **Implement sheet layout (Phase 5)** before PDF export.
5. **Tackle WASM integration (Phase 6)** as the final major feature.
6. **Polish and test (Phase 7)** throughout.

This plan prioritizes incremental deliverables — each phase produces working functionality that can be tested and refined before moving forward.
