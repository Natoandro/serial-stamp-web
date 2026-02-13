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
- Prefer composable, small components over large monolithic ones.
- Use `<a>` tags with proper styling for navigation instead of buttons with `goto()` handlers.

## 6) Form component patterns

- **Prefer uncontrolled forms**: Use native HTML forms with `FormData` on submit, avoiding `$state` for every field.
- Forms expose `onSubmit` callbacks that receive typed data objects.
- Use existing types from `src/lib/types.ts` instead of inline object types for props and callbacks.
- Group related fields into typed objects (e.g., `EventInfo`, `ProjectSettings`) to minimize props.
- Forms work as standard HTML forms with external submit buttons via `formId` prop.
- Only use controlled inputs when specific constraints require real-time validation or interdependent fields.
- Example: `<EventInfoForm initialData={eventInfo} onSubmit={handleSubmit} />` instead of multiple `bind:` props.

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
