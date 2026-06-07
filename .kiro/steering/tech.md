# Tech Stack

## Runtime & framework
- **Next.js 16.2.6** with the App Router (`app/` directory, route groups, server components by default).
- **React 19** + **React DOM 19**.
- **TypeScript 5** in `strict` mode (`noEmit`, `moduleResolution: bundler`, `isolatedModules`).
- Path alias **`@/*` → repo root** (configured in both `tsconfig.json` and `vitest.config.ts`). Use `@/app/...` for all internal imports — never relative paths that traverse upward more than one segment.

## Styling
- **TailwindCSS v4** via `@tailwindcss/postcss` (PostCSS plugin in `postcss.config.mjs`).
- Dark mode is class-based: `.dark` on `<html>`, declared in `app/globals.css` with `@custom-variant dark (&:where(.dark, .dark *))`. Toggle utilities with `dark:` variants.
- A no-flash inline script in `app/layout.tsx` resolves the theme synchronously before hydration; do not move theme resolution to a client effect.
- **SCSS Modules** for per-component styles: pair every `<Name>.tsx` with `<Name>.module.scss`. Shared SCSS variables/mixins live in `app/lib/sass/_variables.scss` and `app/lib/sass/_mixins.scss`.
- Design tokens are defined as CSS custom properties in `:root` and `.dark` blocks in `app/globals.css`. SCSS Modules read them via `var(--token, $fallback)` so tests without the global stylesheet still render.

## Testing
- **Vitest 2** with `environment: "jsdom"`, `globals: true`, setup file `vitest.setup.ts` (registers `@testing-library/jest-dom/vitest` matchers).
- **@testing-library/react 16** for component tests.
- **fast-check 3** for property-based tests. Use the file suffix `.property.test.ts(x)` for PBT files and `.test.ts(x)` for example-based tests. Both patterns are picked up by Vitest's `include`.
- The `@/*` alias resolves identically in tests and Next.js builds.

## Lint
- **ESLint 9** flat config (`eslint.config.mjs`) extending `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. Default Next ignores are re-applied via `globalIgnores`.

## Environment
- `NEXT_PUBLIC_API_BASE_URL` — base URL for the ZKDEX backend. Required in production builds (`getApiBaseUrl()` throws if missing in `NODE_ENV=production`); in development it defaults to `http://localhost:8080`. Point at `http://localhost:3000` to use the in-process mock route handlers under `app/api/*` while the real backend is offline.
- Wallet-signed deposit (FE-14, real mode only — `state.mode === "real"`):
  - `NEXT_PUBLIC_CHAIN_ID` — chain id provided by P1. Required.
  - `NEXT_PUBLIC_CHAIN_RPC` — Tendermint RPC URL. Required.
  - `NEXT_PUBLIC_CHAIN_REST` — REST/LCD URL. Optional but recommended.
  - `NEXT_PUBLIC_CHAIN_BECH32_PREFIX` — defaults to `cosmos`.
  - `NEXT_PUBLIC_CHAIN_FEE_DENOM` — defaults to `uatom`.
  - `NEXT_PUBLIC_CHAIN_DEFAULT_GAS` / `NEXT_PUBLIC_CHAIN_DEFAULT_FEE_AMOUNT` — defaults `200000` / `0`.
  - `NEXT_PUBLIC_CHAIN_DEPOSIT_DENOMS` — comma-separated list, defaults to `USDT,uatom`.
  - These are read lazily in `app/lib/services/wallet/chainConfig.ts`. Mock mode never imports the wallet module, so missing values do not break dev/offline builds.
- All env vars surfaced to the browser MUST be prefixed `NEXT_PUBLIC_`.

## HTTP / data layer
- All API calls go through `request<T>()` in `app/lib/services/http.ts`. Page code calls the typed wrappers in `app/lib/services/api.ts` (`getState`, `postDeposit`, `postBatchBuild`, etc.). Do not call `fetch` directly from components.
- `request<T>` enforces: 15s timeout (overridable via `timeoutMs`), composed `AbortSignal`, `cache: "no-store"` on GETs, normalized `ApiError("Internal Server Error", 500)` for any non-2xx / network / parse / abort failure.
- Domain types live under `app/lib/interfaces/` (split per domain: `state`, `deposit`, `withdraw`, `batch`, `proof`, `api`) with a barrel export at `app/lib/interfaces/index.ts`.

## Common commands
Run from repo root.

```
npm run dev              # Next dev server (http://localhost:3000)
npm run build            # production build (must pass before merging)
npm run start            # serve the production build
npm run lint             # ESLint
npm test                 # Vitest in watch mode
npm run test:coverage    # Vitest single-run with v8 coverage
```

Tip: prefer `npm test -- --run <pattern>` for one-shot CI-style runs without watch mode.

## Versioning rules
- Pin to the versions in `package.json`. Next.js 16 + React 19 are recent — do not assume parity with older Next/React docs (e.g. async `params`, new caching defaults).

