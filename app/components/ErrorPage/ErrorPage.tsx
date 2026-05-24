"use client";

// =============================================================================
// FE-01 App Shell — ErrorPage
// -----------------------------------------------------------------------------
// Full-page NormalizedError UI shared between two surfaces:
//
//   - `AppShell` — when `useAppStateContext().error != null` (data fetch
//     failure, including the 3000 ms timeout watchdog). The page replaces
//     `{children}` underneath the Header so the user sees a stable affordance
//     instead of a thin banner. (Req 10.1, 10.3, 10.5, 10.6)
//   - `app/error.tsx` — when an uncaught render error bubbles into the root
//     error boundary. (Req 13.1, 13.2, 13.3)
//
// Visual structure mirrors `app/not-found.tsx`: a centered column with a
// heading, a short neutral English description, and a single primary action
// button. Tailwind utilities own the layout, so the component renders
// correctly inside the AppShell's `<main className="flex-1">` slot.
//
// Required literals (asserted verbatim by tests and the spec):
//   - Heading text: "Internal Server Error"   (Req 10.3, 13.2)
//   - Action label: "Retry"                   (Req 10.5, 13.3)
//
// What this component intentionally does NOT render:
//   - Backend-specific text (`error.message`, status codes, etc.)
//   - Stack traces
//   - Any non-English string
// (Req 10.3, 13.2, 18.2)
// =============================================================================

import type { ReactElement } from "react";

export interface ErrorPageProps {
  /**
   * Click handler for the literal "Retry" button. Wired to:
   *   - `useAppStateContext().refresh()` from the AppShell. (Req 10.6)
   *   - the Next.js-provided `reset()` callback from `app/error.tsx`. (Req 13.3)
   */
  onRetry: () => void;

  /**
   * When `true`, the retry button renders disabled. Used by the AppShell
   * branch to suppress duplicate `refresh()` calls while a fetch is already
   * in flight; the error-boundary branch leaves it unset (defaults to false).
   */
  isRetrying?: boolean;

  /**
   * Optional descriptive paragraph below the heading. Defaults to a neutral
   * English message; consumers can override but MUST keep the heading and
   * action label literals untouched.
   */
  description?: string;

  /**
   * Large numeric status code rendered above the heading (purely decorative).
   * Defaults to `500` to match the NormalizedError contract. The visible
   * heading literal "Internal Server Error" is preserved unchanged so the
   * spec assertions in Req 10.3 / 13.2 still hold.
   */
  statusCode?: number | string;
}

/** Default neutral English paragraph rendered below the heading. */
const DEFAULT_DESCRIPTION =
  "Something went wrong while loading this page. You can try again or come back later.";

export function ErrorPage({
  onRetry,
  isRetrying = false,
  description = DEFAULT_DESCRIPTION,
  statusCode = 500,
}: ErrorPageProps): ReactElement {
  return (
    <section
      // Mirrors the layout used by `app/not-found.tsx` so the two pages feel
      // visually identical aside from copy. Uses `min-h-dvh` so the page
      // fills the viewport when rendered standalone (root `error.tsx`),
      // and falls back to filling its flex parent inside the AppShell
      // because `flex-1` also takes effect when the parent is a flex column.
      className="min-h-dvh flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center"
      role="alert"
      aria-live="assertive"
    >
      <p
        aria-hidden="true"
        className="text-7xl font-bold leading-none tracking-tight text-neutral-900 sm:text-8xl dark:text-neutral-100"
      >
        {statusCode}
      </p>
      <h1 className="text-2xl font-semibold sm:text-3xl">
        Internal Server Error
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {description}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="inline-flex items-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900"
      >
        Retry
      </button>
    </section>
  );
}

export default ErrorPage;
