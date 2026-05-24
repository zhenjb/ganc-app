"use client";

// =============================================================================
// app/error.tsx — Next.js App Router root error boundary.
// -----------------------------------------------------------------------------
// Catches uncaught render errors thrown by any descendant of the root layout
// (Req 13.1) and surfaces a NormalizedError UI:
//
//   - Renders the literal heading "Internal Server Error" (Req 13.2). No
//     backend-specific text, no stack trace, no `error.message` is exposed.
//   - Renders a literal "Retry" control wired to Next.js's `reset` callback
//     (Req 13.3).
//   - Logs the underlying error via `console.error` exactly once per change of
//     the `error` reference (Req 13.4) using the `[error]` dependency array.
//
// The visible UI is delegated to the shared `ErrorPage` component so the
// boundary, the AppShell error state, and `not-found.tsx` all share the same
// centered full-page layout.
//
// Mounted by Next.js inside the existing `RootLayout`, so no extra layout
// wrapping is required here.
// =============================================================================

import { useEffect } from "react";

import ErrorPage from "@/app/components/ErrorPage/ErrorPage";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({
  error,
  reset,
}: RootErrorProps): React.ReactElement {
  // Req 13.4 — log exactly once per distinct `error` reference. The `[error]`
  // dependency array ensures the effect re-runs only when Next.js hands us a
  // new Error instance, not on incidental re-renders with the same identity.
  useEffect(() => {
    console.error("[FE-01] root error boundary", error);
  }, [error]);

  return <ErrorPage onRetry={reset} />;
}
