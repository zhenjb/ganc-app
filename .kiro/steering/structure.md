# Project Structure

## Top level
```
ganc-app/
├─ app/                    # Next.js App Router source (everything ships from here)
├─ public/                 # static assets served at /
├─ task/                   # FE-01..FE-13 task briefs + screenshots artefact
├─ .kiro/                  # specs + steering for the AI workflow
├─ .github/workflows/      # CI (Node.js workflow)
├─ next.config.ts          # Next config (currently empty)
├─ tsconfig.json           # strict TS, @/* → repo root
├─ vitest.config.ts        # jsdom + @ alias + .test/.property.test patterns
├─ vitest.setup.ts         # registers jest-dom matchers
├─ eslint.config.mjs       # flat config, extends next/core-web-vitals + next/typescript
├─ postcss.config.mjs      # @tailwindcss/postcss
└─ .env.example            # NEXT_PUBLIC_API_BASE_URL
```

## `app/` layout
```
app/
├─ layout.tsx              # Root layout: <html>/<body>, ThemeProvider, no-flash script. Server component.
├─ page.tsx                # Redirect → /overview
├─ not-found.tsx           # Root 404 (lives OUTSIDE (pages) by design)
├─ error.tsx               # Root error boundary → renders <ErrorPage onRetry={reset} />
├─ globals.css             # Tailwind v4 import + design tokens + .dark overrides + scroll-lock
│
├─ (pages)/                # Route group — does NOT appear in URLs
│  ├─ layout.tsx           # Mounts AppStateProvider + AppShell. THIS is where /api/state fires.
│  ├─ overview/            # /overview        (FE-03)
│  ├─ deposit/             # /deposit         (FE-04)
│  ├─ withdraw/            # /withdraw        (FE-05)
│  │  └─ claim/            # /withdraw/claim  (FE-09)
│  ├─ batch/               # /batch           (FE-06)
│  ├─ proof/               # /proof           (FE-07)
│  │  └─ submit-proof/     # /proof/submit-proof (FE-08)
│  ├─ failure/             # /failure         (FE-10, to be created)
│  ├─ how-it-works/        # /how-it-works    (FE-11, to be created)
│  └─ survey/              # /survey          (FE-12, to be created)
│
├─ api/                    # Next route handlers (in-process mocks while real backend offline)
│  ├─ state/               # GET  /api/state
│  ├─ deposit/             # POST /api/deposit
│  ├─ withdraw-request/    # POST /api/withdraw-request
│  ├─ withdraw/claim/      # POST /api/withdraw/claim
│  ├─ batch/build/         # POST /api/batch/build
│  ├─ batch/submit/        # POST /api/batch/submit
│  ├─ proof/generate/      # POST /api/proof/generate
│  └─ _mock/               # mock data + helpers (private to api/)
│
├─ assets/
│  ├─ icons/               # SVG-as-React-component icons (PascalCase: BatchIcon.tsx)
│  └─ index.ts             # barrel re-export
│
├─ components/             # SHARED components (used by ≥ 2 pages)
│  └─ <Name>/
│     ├─ <Name>.tsx
│     ├─ <Name>.module.scss
│     └─ __snapshots__/    # only when applicable
│
├─ constants/              # shared constants (breakpoints, nav config, theme, explanations)
│
└─ lib/
   ├─ contexts/            # React Context providers (AppStateContext, ThemeContext)
   ├─ hooks/               # shared hooks (useAppState, useTheme, useMediaQuery, useEscapeKey, useOnClickOutside)
   ├─ interfaces/          # domain types split per area + barrel index
   ├─ sass/                # _variables.scss, _mixins.scss
   └─ services/            # api.ts (typed wrappers), http.ts (request<T>), format.ts, status.ts
```

## Per-page convention (mandatory)
Every page under `app/(pages)/<page>/` follows this shape:
```
<page>/
├─ page.tsx
├─ page.module.scss
├─ _components/   # components used ONLY by this page
├─ _lib/          # hooks/helpers used ONLY by this page
└─ _types/        # types/DTOs used ONLY by this page
```

**Hard rule:** code in `_components/`, `_lib/`, `_types/` of one page MUST NOT be imported by another page. The leading underscore signals "private". When something needs to be reused, **promote** it:
- shared component → `app/components/<Name>/`
- shared hook/helper → `app/lib/hooks/` or `app/lib/services/`
- shared type → `app/lib/interfaces/<domain>.ts`
- shared constant → `app/constants/`

## Naming conventions
- Components: `PascalCase` folder + file (`AppShell/AppShell.tsx`).
- Hooks: `useXxx.ts` in `app/lib/hooks/` (or page-private `_lib/`).
- Contexts: `XxxContext.tsx` exporting both the provider and the hook (or paired `useXxx` in `hooks/`).
- Icons: `XxxIcon.tsx` in `app/assets/icons/`, re-exported through `app/assets/index.ts`.
- Tests: co-locate as `<Name>.test.tsx` (example-based) or `<Name>.property.test.ts` (fast-check PBT).
- SCSS Modules: `<Name>.module.scss` next to the component. Page-level styles use `page.module.scss`.

## Imports
- Use the `@/*` alias for everything, e.g. `import AppShell from "@/app/components/AppShell/AppShell";`.
- Do not use long relative chains (`../../..`).
- Barrel exports exist at `app/assets/index.ts` and `app/lib/interfaces/index.ts`. Import from the barrel for cross-domain consumers; reach into specific files within the same domain.

## Where things go (quick map)
| You want to add…                              | Put it in…                                  |
|-----------------------------------------------|---------------------------------------------|
| A new route                                   | `app/(pages)/<page>/page.tsx` + private dirs |
| A page-only component                         | `app/(pages)/<page>/_components/`           |
| A reusable component                          | `app/components/<Name>/`                    |
| A new API endpoint type                       | `app/lib/interfaces/<domain>.ts` + barrel    |
| A typed API call wrapper                      | `app/lib/services/api.ts`                   |
| A shared React hook                           | `app/lib/hooks/`                            |
| A shared constant or config                   | `app/constants/`                            |
| A new icon                                    | `app/assets/icons/<Name>Icon.tsx` + barrel  |
| Mock backend behaviour                        | `app/api/<route>/route.ts` + `app/api/_mock/` |

## .kiro / specs
- `.kiro/specs/<feature-name>/` holds `requirements.md`, `design.md`, `tasks.md` for each spec. Do not edit these by hand outside the spec workflow.
- `.kiro/steering/*.md` (this folder) is always-on guidance loaded into the AI assistant.
