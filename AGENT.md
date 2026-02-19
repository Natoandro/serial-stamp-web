# Agent Rules (serial-stamp)

These rules are the source of truth for how I should work in this repo. Keep this file concise and updated.

## 0) Consistency with this file

- If you (the user) change/add rules, I must update `agent.md` in the same change.
- If I receive an instruction that conflicts with `agent.md`, I must stop and ask whether you want to:
  1. update `agent.md` to match the new instruction, or
  2. abort the task.

## 1) Keep documentation short

- No long documentation, either as separate docs or large comment blocks.
- Prefer self-explanatory code and good naming.
- Skip writing docs that can be inferred from context.
- Only add an example if the concept is genuinely complex.

## 2) Svelte 5 only (modern patterns)

- Use Svelte 5 and runes (`$state`, `$derived`, `$effect`, etc.).
- Do not use legacy patterns like Svelte stores (`writable`, `readable`, `derived`) or store auto-subscriptions (`$store`).
- Do not use deprecated Svelte features like `<slot>` - use `{@render children()}` with `Snippet` types instead.
- Always use `$app/state` instead of `$app/stores` (e.g., `page` state from `$app/state`).
- Prefer idiomatic SvelteKit patterns for data loading and routing.

## 3) Tasks/scripts discipline

- Before running any task/script, check `package.json` for available scripts.
- Always use `pnpm` as the package manager (never `npm` or `yarn`).
- When proposing commands, use the scripts defined in `package.json`.

## 4) Project: Serial Stamp

- This is a web app to add “stamps” onto an image (e.g., ticket numbering, barcodes/QR codes) where many tickets are printed on a large sheet then cut.
- Prefer features that support batch generation, precise placement, and print-ready output.

## 5) UI component library discipline

- Always extract reusable UI elements into dedicated components.
- SVG icons must be in their own components (e.g., `IconTrash.svelte`, `IconPlus.svelte`).
- Build a consistent component library under `src/lib/components/ui/` for buttons, inputs, modals, etc.
- **Use Svelte snippets** for repetitive UI patterns within a component (e.g., similar buttons, list items).
- Prefer composable, small components over large monolithic ones.
- Use `<a>` tags with proper styling for navigation instead of buttons with `goto()` handlers.

## 6) Form component patterns

- **Prefer TanStack Form**: Use `@tanstack/svelte-form` for all forms to ensure consistent state, validation (Zod), and dirty tracking.
- Forms must use native `<form>` tags with a proper submit button to ensure "Enter to submit" works.
- Handle form submission via `onsubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }}`.
- Use existing types from `src/lib/types.ts` for form values and callbacks.
- Forms expose `onDirtyChange` callbacks to notify parents of state changes.
- Use `getFieldError(field)` utility for consistent error rendering.
- Avoid inline editing for complex objects; prefer dedicated forms in modals.
- **Debounce real-time preview updates**: Use 100ms debounce for preview updates (WASM rendering is fast enough).
- **Optimize preview rendering**: Use direct canvas rendering instead of data URLs, cache template conversions, and show previous preview while new one loads.
- **Popups must escape overflow containers**: Use `fixed` positioning with `getBoundingClientRect()` for dropdowns that may be clipped by `overflow-y-auto` parents.

## 7) Code quality defaults

- Keep changes minimal and focused.
- Prefer small, composable modules over one large file.
- Maintain formatting/linting expectations (Prettier/ESLint).
- Avoid introducing dependencies unless they clearly reduce complexity or are needed for correctness.

## 8) Git operations

- Always use "." as the `repo_path` parameter for all git operations.
- Never use the full absolute path or the project name as repo_path.

## 9) Safety & correctness

- Avoid destructive operations unless explicitly requested.
- Validate assumptions; if key product behavior is ambiguous (e.g., coordinate system, DPI/print scaling, barcode formats), ask concise clarifying questions before implementing.

## 10) WASM development

- WASM code lives in `src-wasm/` (Rust crate).
- After editing Rust code, run `cd src-wasm && cargo check` to verify compilation before building WASM.
- Build WASM with `pnpm run build:wasm` (uses wasm-pack).
- WASM output goes to `src/lib/wasm/` (generated files).
- Always initialize WASM modules before use: `const { func, default: init } = await import('$lib/wasm/module'); await init();`
- For image processing in WASM, use the `image` crate with PNG/JPEG features enabled.
- Keep WASM functions focused and simple; handle complex orchestration in TypeScript.

## 11) Scaling discipline (CRITICAL)

- **UNIFORM SCALING ONLY**: All image/ticket scaling MUST use the same factor for both X and Y axes.
- Use `Math.min(scaleX, scaleY)` to maintain aspect ratio without distortion.
- Never scale X and Y independently—this causes visual distortion.
- After uniform scaling, **center** the scaled template within its grid cell to avoid misalignment.
- Apply scaling ONCE (in WASM), not multiple times in the pipeline.
- Use `.round()` for ALL pixel calculations in both TypeScript and Rust to ensure dimension matching.
- When user sets margins to 0, the actual margin in the output MUST be 0 (no automatic padding unless explicitly documented).
- In WASM/Rust code, only add visual margins (like the 10mm preview border) if they are clearly for preview purposes, not part of the actual document layout.
- Template images must be scaled isotropically to fit target dimensions calculated from mm measurements.

## 12) Preview zoom functionality

- All canvas-based previews MUST support zoom/pan controls for detailed inspection.
- **Zoom controls**: Mouse wheel, keyboard shortcuts (Ctrl/Cmd +/-/0), and UI buttons.
- **Pan controls**: Click and drag to pan when zoomed in.
- **Zoom UI**: Display current zoom percentage, zoom in/out buttons, reset button, and fit-to-screen button.
- **Fit to screen**: MUST auto-fit canvas on initial load with 10% padding; provide button for manual fit.
- **Zoom centering**: Mouse wheel zoom MUST be centered precisely on cursor position using accurate coordinate transformation (convert cursor to canvas space, then recalculate pan after zoom).
- **Help text**: Show keyboard/mouse shortcuts in the preview area including fit-to-screen hint.
- **Transform approach**: Use CSS `transform: scale()` and `translate()` for smooth, GPU-accelerated zoom/pan.
- **Canvas positioning**: Canvas MUST be `position: absolute` within container with `overflow: hidden` to prevent scrollbars.
- **Zoom range**: MIN_ZOOM = 0.1 (10%), MAX_ZOOM = 5 (500%), ZOOM_STEP = 0.1 (10%).

## 13) Text rendering in WASM

- All text stamps MUST be rendered with actual fonts, not placeholder boxes.
- Use `ab_glyph` + `imageproc` for text rendering in Rust/WASM.
- **Font loading**: Fonts are served from `static/fonts/` and fetched by the frontend, then passed to WASM as `Vec<u8>`.
- **Available fonts**: Only the 5 fonts defined in `AVAILABLE_FONTS` (types.ts) are available in the font selector.
- **Font files**: 5 TTF files in `static/fonts/`: Roboto-Regular.ttf, OpenSans-Regular.ttf, Lora-Regular.ttf, RobotoMono-Regular.ttf, Inter-Regular.ttf (committed to repo).
- **Font caching**: Frontend caches loaded fonts using `fontLoader.ts` service.
- **WASM signature**: `render_sheet()` accepts font data as third parameter: `render_sheet(config_json, template_data, font_data)`.
- Support text alignment: left, center, right.
- Support vertical alignment: top, middle, bottom.
- Scale font size with template scaling factor.
- Parse CSS color strings using `csscolorparser` crate.
- Text rendering MUST handle template variable substitution (e.g., `{{number}}`).

## 14) Coordinate system in WASM rendering

- **Stamp coordinates are template-relative**: All stamp positions (x, y) are defined in pixels relative to the ORIGINAL template image size.
- **Template scaling**: When the template is resized to fit ticket dimensions, calculate scale factors: `template_scale_x = target_width / original_template_width` and `template_scale_y = target_height / original_template_height`.
- **Apply template scale to stamps**: Multiply all stamp coordinates by the template scale factors, NOT by the sheet-level scale.
- **Font size scaling**: Use average of x/y template scales for font size: `avg_scale = (template_scale_x + template_scale_y) / 2.0`.
- **Never use sheet-level scale for stamp positioning**: The `self.scale` in TicketRenderer is for sheet layout, not stamp coordinates.

## 15) Text stamp positioning (anchor point model)

- **Anchor point, not bounding box**: `(x, y)` represents the anchor point for text positioning, NOT the top-left of a bounding box.
- **Ignore width/height for positioning**: The `width` and `height` fields in TextStamp are NOT used for text positioning calculations.
- **Measure actual text size**: Always calculate text dimensions using `text_size()` from the rendered font and text string.
- **Horizontal alignment relative to anchor**:
  - `left`: Text starts at anchor_x (anchor at left edge of text)
  - `center`: Text starts at anchor_x - text_width/2 (anchor at center of text)
  - `right`: Text starts at anchor_x - text_width (anchor at right edge of text)
- **Vertical alignment relative to anchor**:
  - `top`: Text starts at anchor_y (anchor at top edge of text)
  - `middle`: Text starts at anchor_y - text_height/2 (anchor at middle of text)
  - `bottom`: Text starts at anchor_y - text_height (anchor at bottom edge of text)
