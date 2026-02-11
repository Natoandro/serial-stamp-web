# Serial Stamp

Serial Stamp is a web app for adding “stamps” onto an image — e.g. ticket numbering, barcodes, QR codes, labels, and other repeated overlays.

A common workflow is:
- Start from a large “sheet” image intended for printing
- Place stamps at precise positions (often as a grid)
- Generate many unique tickets on one sheet
- Print the sheet and cut it afterward

## Tech stack

- SvelteKit (Svelte 5)
- Vite
- TypeScript
- Tailwind CSS

## Development

Install dependencies (the repo uses pnpm):

```/dev/null/sh#L1-1
pnpm install
```

Start the dev server:

```/dev/null/sh#L1-1
pnpm dev
```

## Scripts

These are the available scripts (from `package.json`):

- `dev`: start the Vite dev server
- `build`: create a production build
- `preview`: preview the production build locally
- `prepare`: run SvelteKit sync (used by tooling)
- `check`: run SvelteKit sync + `svelte-check`
- `check:watch`: same as `check`, in watch mode
- `lint`: run Prettier check + ESLint
- `format`: run Prettier write

Run them with pnpm, e.g.:

```/dev/null/sh#L1-7
pnpm build
pnpm preview

pnpm check
pnpm check:watch

pnpm lint
pnpm format
```

## Notes

Keep documentation concise and prefer self-explanatory code and naming. This project targets Svelte 5 (use runes; avoid legacy store patterns).