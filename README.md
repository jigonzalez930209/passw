# passw

Desktop password generator built with Tauri 2, React 19, TypeScript, and Vite. Ships as a lightweight native app and can also be built as a static site for GitHub Pages.

## Features
- __Password generator__: configurable length and character sets (see `src/utils/pass-generator.ts`).
- __Modern UI__: Tailwind CSS v4, shadcn-style UI primitives (`src/components/ui/`).
- __Cross‑platform__: Ubuntu (.deb), macOS, and Windows builds via GitHub Actions.

## Tech Stack
- __Frontend__: React 19, TypeScript, Vite 7, Tailwind CSS 4
- __Desktop__: Tauri 2 (`src-tauri/`)
- __Tooling__: pnpm, GitHub Actions

## Scripts
Defined in `package.json`:
- `pnpm dev` – run Vite dev server for the frontend
- `pnpm build` – type-check and build frontend (output `dist/`)
- `pnpm preview` – preview the built frontend
- `pnpm tauri` – Tauri CLI (dev/build)
- `pnpm build:pages` – build static site for GitHub Pages

## Development
1. Install Rust (stable) and Node.js 20.
2. Install deps: `pnpm install`
3. Run desktop in dev:
   - Frontend + Tauri dev: `pnpm tauri dev`

## Building
Local desktop build:
```
pnpm build && pnpm tauri build
```
Tauri configuration lives in `src-tauri/tauri.conf.json`. Frontend output is expected in `dist/`.

## CI/CD
- __Pages__: `/.github/workflows/pages.yml` builds the static site and deploys to GitHub Pages.
- __Desktop__: `/.github/workflows/tauri.yml` builds release artifacts. On Ubuntu it uploads a `.deb` (and macOS/Windows use default bundles).
  - Trigger by pushing a tag like `v0.1.2`, or run manually from Actions.

## License
MIT — see [`LICENSE`](./LICENSE).
