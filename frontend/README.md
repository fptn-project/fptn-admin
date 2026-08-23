# fptn-admin — frontend

Admin panel SPA for an [fptn](https://github.com/batchar2/fptn) VPN deployment.
React + TypeScript + Vite, talking to the [backend API](../backend) over HTTP.

## Features

- **Auth** — JWT login, forced password change on first login (default admin
  credentials), auto-redirect on 401.
- **Users** — paginated, searchable, filterable (all / blocked / premium)
  table; inline max-speed editing; one-click block/unblock and premium
  toggles.
- **Servers** — add / delete VPN nodes (regular, premium, censored-zone),
  IPv4-validated host field, live ping display.
- **Dashboard** — total / premium user counts at a glance.
- **Give premium access** — paste one or more fptn access tokens, decode them
  client-side, and grant premium in bulk.
- **i18n** — English and Russian, switchable at runtime (persisted to
  `localStorage`), via `react-i18next`.
- **Light/dark theme**, persisted the same way.

## Tech stack

| | |
|---|---|
| Framework | React 18 + TypeScript, [Vite](https://vitejs.dev/) |
| Routing | React Router 6 |
| Styling | Tailwind CSS |
| i18n | i18next / react-i18next |
| Icons | lucide-react |
| Tooling | ESLint, Prettier, Husky + commitlint (Conventional Commits) |

State is plain React (`useState`/`useContext`) — no Redux/Zustand. Auth,
theme, and sidebar-layout state each live in their own context provider
(`src/context`, `src/theme`, `src/components/layout/LayoutContext.tsx`); page
data (users, servers, dashboard) is fetched per-page with `useEffect` and
kept in local state.

## Getting started

```bash
npm install
npm run dev
```

The dev server expects the [backend](../backend) to be running (see its
README for `docker compose up`) on `:8000` — `/api` is proxied there by Vite
(see `vite.config.ts`), so no `.env` setup is needed by default; copy
`.env.example` to `.env` and set `VITE_API_BASE_URL` only if the backend runs
elsewhere. Default login is `admin` / `admin`, which the app will immediately
prompt you to change.

There's also a `Dockerfile` (multi-stage: lint + typecheck + vitest, then
`vite build`, served by nginx with SPA fallback) — `docker compose up` from
the repo root builds and runs this alongside the backend, on `https://:2663`
(plain `http://:8080` just redirects there, since browsers default to
`http://` for a bare `host:port`). nginx generates a self-signed TLS cert on
first start (persisted in the data folder) and proxies `/api/` to the
backend, same as the Vite dev proxy.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc`) then production build |
| `npm run serve` | Preview a production build locally |
| `npm run lint` | ESLint over `.ts`/`.tsx`/`.js` |
| `npm test` | Vitest (jsdom) — unit + component tests, `*.test.ts(x)` next to the code they cover |

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` | Base URL the frontend calls for the backend API. Unset, it's a relative path proxied to the backend by Vite in dev or nginx in production — set this only to point at a backend on a different origin. |

## Project structure

```
src/
  api/          fetch wrappers per resource (auth, users, servers, dashboard)
  components/
    layout/     header, sidebar, language switcher, layout context
    ui/         generic primitives (Button, Modal, Table, Pagination, ...)
  context/      AuthContext (JWT, mustChangePassword)
  i18n/         i18next setup + en/ru locale JSON
  lib/          fptn access-token decoding (brotli-wasm)
  pages/        one component per route
  theme/        light/dark ThemeProvider
```

## Notes for contributors

- `brotli-wasm` is excluded from Vite's dependency pre-bundling
  (`vite.config.ts`) — its `.wasm` binary resolution breaks under esbuild's
  optimizer otherwise.
- Backend error responses use `{"message": "..."}`, not the FastAPI default
  `{"detail": "..."}`; `api/client.ts` checks both, but it's worth knowing if
  you're wiring up a new endpoint.
- `vitest` is pinned at `^0.32.2`, well behind current. Its jsdom environment
  wiring only works with `jsdom@^22`; a bare `npm install jsdom` pulls latest
  (jsdom 29+ at the time of writing) and breaks `atob`/`btoa` inside every
  test with a cryptic `InvalidCharacterError`. Same story for
  `@testing-library/react` — pin to `^14` (React 18-era), the latest major
  wants `@types/react-dom` types this project doesn't have. Bumping `vitest`
  itself would remove the need for both pins.
