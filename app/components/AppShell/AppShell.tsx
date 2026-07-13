"use client";

// =============================================================================
// FE-01 App Shell — AppShell
// -----------------------------------------------------------------------------
// The shared chrome that wraps every page (Req 1.1, 1.2, 1.3). Mounted from
// `app/layout.tsx` inside `<AppStateProvider>` so banner orchestration can
// read live values from `useAppStateContext()`.
//
// Layout (Tailwind utilities own this; SCSS Module only owns the retry
// button stateful styles):
//
//   <div class="min-h-dvh flex flex-col">
//     <Header />
//     {mock-mode banner?}                 ← warning, non-dismissible
//     <main class="flex-1">
//       {error != null ? <ErrorPage /> : {children}}
//     </main>
//     <Footer />
//   </div>
//
// `min-h-dvh` keeps the shell at least the dynamic viewport height so the
// footer sits at the bottom on short pages even when the keyboard / mobile
// browser chrome is visible. `flex-1` on `<main>` consumes the remaining
// space between Header and Footer.
//
// Surface orchestration
// ---------------------
// 1) `error != null`               → render the full-page `ErrorPage`
//                                    (literal heading "Internal Server Error",
//                                    literal "Retry" button wired to
//                                    `refresh()` and disabled while
//                                    `inFlight` is true). Replaces `{children}`
//                                    so the user sees a stable, centered
//                                    affordance instead of a thin banner.
//                                    (Req 10.1, 10.3, 10.5, 10.6)
// 2) `error == null && state?.mode === "mock"`
//                                  → non-dismissible warning banner with the
//                                    literal message "Mock mode — not real
//                                    data" rendered directly below the
//                                    Header. (Req 9.1, 9.2, 9.3)
// 3) When the error page is shown, the mock banner stays hidden so the chrome
//    presents a single, focused message. The banner returns automatically on
//    the next successful fetch.
//
// 404-vs-500 separation
// ---------------------
// The AppShell is mounted only from `app/(pages)/layout.tsx`, so it only
// ever wraps URLs that resolve to a real page file. Unknown URLs fall back
// to the root `app/not-found.tsx` outside the `(pages)` route group, which
// means they never mount `AppStateProvider`, never fire `GET /api/state`,
// and consequently can never surface the "Internal Server Error" UI. The
// 404 page is reached only by URL mis-routing; the 500 page is reached only
// by a backend failure on a valid route. The separation is enforced by
// composition rather than by a runtime route allow-list, so it cannot drift
// out of sync with `NAV_ITEMS` when a leaf is added without a page file.
//
// Marked "use client" because `useAppStateContext()` is a client-only hook
// and the retry button is interactive.
// =============================================================================

import { type ReactNode } from "react";

import AnnouncementBanner from "@/app/components/AnnouncementBanner/AnnouncementBanner";
import ErrorPage from "@/app/components/ErrorPage/ErrorPage";
import Header from "@/app/components/Header/Header";
import { useAppStateContext } from "@/app/lib/contexts/AppStateContext";

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): React.JSX.Element {
  const { state, error, inFlight, refresh } = useAppStateContext();

  // Surface the NormalizedError as a full-page replacement for `{children}`
  // whenever the AppShell's `useAppState()` reports a failure. The shell
  // only mounts on valid routes, so a non-null `error` always corresponds
  // to an actual API call against a real page (Req 10.1, 10.3, 10.5, 10.6).
  const showErrorPage = error != null;

  // Surface the mock-mode banner only while there is no active error so the
  // chrome stays focused on a single message. When the error clears, the
  // banner returns automatically on the next successful fetch (Req 9.1, 9.2).
  const showMockBanner = error == null && state?.mode === "mock";

  // The retry handler returns a Promise (`refresh()` is async). The button's
  // `onClick` is fire-and-forget so React does not warn about "promise
  // returned to event handler" — wrapping it in a synchronous closure makes
  // the intent explicit.
  const handleRetry = (): void => {
    void refresh();
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />

      {showMockBanner ? (
        <AnnouncementBanner
          variant="warning"
          // Req 9.1 — exact literal including the em-dash separator. The
          // string is also asserted verbatim by Property 8 in design.md.
          message="Mock mode — not real data"
          // Req 9.3 — non-dismissible. `false` is the default for the
          // banner component, but we set it explicitly so the intent is
          // visible at the call site and any future default change does
          // not silently flip the behavior.
          dismissible={false}
        />
      ) : null}

      <main className="flex-1 flex flex-col">
        {showErrorPage ? (
          <ErrorPage onRetry={handleRetry} isRetrying={inFlight} />
        ) : (
          children
        )}
      </main>
    </div>
  );
}

export default AppShell;
