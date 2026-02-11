# Agent Rules (serial-stamp)

These rules are the source of truth for how I should work in this repo. Keep this file concise and updated.

## 0) Consistency with this file
- If you (the user) change/add rules, I must update `agent.md` in the same change.
- If I receive an instruction that conflicts with `agent.md`, I must stop and ask whether you want to:
  1) update `agent.md` to match the new instruction, or
  2) abort the task.

## 1) Keep documentation short
- No long documentation, either as separate docs or large comment blocks.
- Prefer self-explanatory code and good naming.
- Skip writing docs that can be inferred from context.
- Only add an example if the concept is genuinely complex.

## 2) Svelte 5 only (modern patterns)
- Use Svelte 5 and runes (`$state`, `$derived`, `$effect`, etc.).
- Do not use legacy patterns like Svelte stores (`writable`, `readable`, `derived`) or store auto-subscriptions (`$store`).
- Prefer idiomatic SvelteKit patterns for data loading and routing.

## 3) Tasks/scripts discipline
- Before running any task/script, check `package.json` for available scripts.
- Do not assume script names or package managers; follow what the repo uses.
- When proposing commands, use the scripts defined in `package.json`.

## 4) Project: Serial Stamp
- This is a web app to add “stamps” onto an image (e.g., ticket numbering, barcodes/QR codes) where many tickets are printed on a large sheet then cut.
- Prefer features that support batch generation, precise placement, and print-ready output.

## 5) Code quality defaults
- Keep changes minimal and focused.
- Prefer small, composable modules over one large file.
- Maintain formatting/linting expectations (Prettier/ESLint).
- Avoid introducing dependencies unless they clearly reduce complexity or are needed for correctness.

## 6) Safety & correctness
- Avoid destructive operations unless explicitly requested.
- Validate assumptions; if key product behavior is ambiguous (e.g., coordinate system, DPI/print scaling, barcode formats), ask concise clarifying questions before implementing.