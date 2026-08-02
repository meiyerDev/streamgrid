# AGENTS.md

## Stack & layout

Electron 39 + React 19 + TypeScript, built with `electron-vite`. Package manager is **pnpm** (`.npmrc` has `shamefully-hoist=true`; don't introduce npm/yarn).

Three independent processes, each with its own bundle and tsconfig:

- `src/main/` — Electron main process (`tsconfig.node.json`)
- `src/preload/` — preload bridge, exposed to the renderer as `window.electron` / `window.api` (`tsconfig.node.json`)
- `src/renderer/` — React app (`tsconfig.web.json`), alias `@renderer/*` → `src/renderer/src` (Vite + tsconfig.web only, not node configs)

`tsconfig.json` is just project references (`"files": []`) — never run bare `tsc`; use the scripts below.

## Commands

```bash
pnpm install            # postinstall runs electron-builder install-app-deps
pnpm dev                # dev server + Electron with HMR
pnpm typecheck          # runs BOTH tsconfig.node.json and tsconfig.web.json
pnpm lint               # eslint --cache .
pnpm format             # prettier --write .
pnpm build              # typecheck first, then electron-vite build (outputs to out/)
pnpm build:linux        # electron-vite build + electron-builder --linux (NO typecheck)
```

Verification order: `pnpm lint` → `pnpm typecheck` → `pnpm build`.

- `build:linux` and `build:mac` skip typecheck (only `build:win`/`build:unpack` run it via `npm run build`).
- There is **no test framework** configured; don't invent a test command.
- Build output goes to `out/` (gitignored), not `dist/`.

## Conventions & gotchas

- Prettier: no semicolons, single quotes, no trailing commas, width 100. `.prettierignore` excludes tsconfig files and lockfiles.
- `src/renderer/index.html` has a strict CSP (`script-src 'self'`) — no inline scripts; import scripts from `src/main.tsx`.
- Main process runs with `sandbox: false` for the renderer; IPC is tested via an `ipcMain.on('ping')` stub in `src/main/index.ts`.
- `DESIGN.md` is the UI design spec (Discord-style aesthetic: deep-indigo canvas, Blurple/green/magenta). Its named fonts (ABC Ginto Nord, ggsans) are proprietary — substitute per the note in DESIGN.md.
- `.agents/skills/` holds installed agent skills (frontend-design, react-best-practices, vite, etc.) — load the relevant skill when doing renderer/UI work.
