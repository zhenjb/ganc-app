// =============================================================================
// app/not-found.tsx — root-level 404 page.
// -----------------------------------------------------------------------------
// Mounted under `app/layout.tsx` (NOT under `app/(pages)/layout.tsx`), so
// when a user navigates to a URL that does not match any defined page file,
// Next.js renders this page directly. The `AppStateProvider` and the App
// Shell live inside the `(pages)` route group and are intentionally NOT in
// scope here, which means:
//
//   - No `GET /api/state` request is fired for unknown URLs.
//   - The "Internal Server Error" UI cannot appear on a 404 surface.
//
// The 404-vs-500 separation is therefore enforced by composition rather
// than by a runtime route allow-list: only valid routes mount the shell,
// only the shell can surface the 500 page.
// =============================================================================

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p
        aria-hidden="true"
        className="text-7xl font-bold leading-none tracking-tight text-neutral-900 sm:text-8xl dark:text-neutral-100"
      >
        404
      </p>
      <h1 className="text-2xl font-semibold sm:text-3xl">Page not found</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/overview"
        className="inline-flex items-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-700 dark:hover:bg-neutral-900"
      >
        Back to Overview
      </Link>
    </main>
  );
}
