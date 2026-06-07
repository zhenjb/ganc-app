# Product

## What this app is
**ZKDEX MVP** — a Next.js dashboard that demos the end-to-end ZKDEX flow with real ZK proofs. It is the P5 (Frontend) surface for the broader ZKDEX system and is intended for survey participants and reviewers, not production traders.

## Core flow
The dashboard walks the user through eight ordered steps that mirror the on-chain pipeline:

`Overview → Deposit → Withdraw Request → Batch → Proof → Submit → Claim → Failure Demo`

The shell exposes this flow as top-nav tabs with status indicators (`idle | active | done | error`) driven by `GET /api/state`. The current step's content renders in `<main>` while the header keeps the global state (mode badge, current state root) visible at all times.

## Operating modes
The backend reports `mode: "Mock" | "Local"` via `/api/state`. The UI surfaces this in a header badge and may show a mock-mode `AnnouncementBanner`. Frontend code MUST behave identically in both modes; differences are the backend's concern.

## Hard product rules (non-negotiable)
- **English-only UI.** Every user-visible string (labels, buttons, banners, toasts, tooltips, validation messages, survey copy) MUST be English. Source comments and identifiers may be any language. If a task spec contains Vietnamese, treat it as a hint and translate.
- **Single normalized error.** Every API/network/parse failure surfaces to the user as exactly `"Internal Server Error"` with status `500`. Backend-specific text (e.g. `"insufficient balance"`, `"already claimed"`, `"nullifier reused"`) MUST NOT be rendered. Root causes go to `console.error` for developers only. Normalization is centralized in `app/lib/services/http.ts` — pages do not re-implement it.
- **404-vs-500 separation by composition.** The App Shell and `AppStateProvider` mount only inside the `app/(pages)/` route group. Unknown URLs fall through to `app/not-found.tsx` (root) and never trigger `GET /api/state`, so the 500 surface cannot appear on a 404.
- **Failure Demo is the only place that surfaces raw request/response JSON**, and only inside a developer panel. User-facing badges there still say `PASS` / `FAIL` in English.

## Audience
Survey participants reviewing the ZKDEX flow end-to-end. Optimize for clarity of the pipeline (step-based progress, stable header) over trader ergonomics.
