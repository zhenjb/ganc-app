// =============================================================================
// Batch Page (FE-06) — client shell
// -----------------------------------------------------------------------------
// Thin client shell for /batch. Reads the shared app state from
// AppStateContext and decides what to render:
//
//   1. error !== null → single NormalizedError banner; the BatchInputSelector
//      and Build button are NOT mounted (Req 1.5, 12.1).
//   2. state === null → loading skeleton inside a role="status" /
//      aria-live="polite" region with a screen-reader label "Loading batch…".
//      The selector/build button are not interactive in this state because
//      BatchScreen is not rendered at all (Req 1.2, 1.3).
//   3. state !== null → delegate to <BatchScreen> (Req 1.4).
//
// The shell never calls `fetch` directly; it only reads via the context
// (Req 1.6). It renders inside the existing (pages) route group / App Shell
// (Req 1.1), so no extra provider wiring is needed here.
//
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
// =============================================================================

"use client";

import { useAppStateContext } from "@/app/lib/contexts/AppStateContext";
import { AnnouncementBanner } from "@/app/components/AnnouncementBanner/AnnouncementBanner";
import { BatchScreen } from "@/app/(pages)/batch/_components/BatchScreen/BatchScreen";
import styles from "./page.module.scss";

/** English UI strings (English-only UI per product rules). */
const NORMALIZED_ERROR = "Internal Server Error";

/**
 * BatchPage — client shell for /batch.
 *
 * Responsibilities:
 *  1. Read { state, refresh, inFlight, error } from AppStateContext.
 *  2. Render the NormalizedError banner when the state fetch failed.
 *  3. Render a loading skeleton while state is null.
 *  4. Render <BatchScreen> when state is ready.
 */
export default function BatchPage(): React.JSX.Element {
  const { state, refresh, inFlight, error } = useAppStateContext();

  return (
    <div className={styles.page}>
      {error !== null ? (
        // NormalizedError surface — no selector / Build button mounted
        // (Req 1.5, 12.1).
        <AnnouncementBanner variant="error" message={NORMALIZED_ERROR} />
      ) : state !== null ? (
        // State ready — delegate to the orchestrator (Req 1.4).
        <BatchScreen state={state} refresh={refresh} inFlight={inFlight} />
      ) : (
        // State still loading — skeleton in a polite live region (Req 1.2, 1.3).
        <div
          className={styles.loadingSkeleton}
          role="status"
          aria-live="polite"
        >
          <span className={styles.srOnly}>Loading batch…</span>
          <div className={styles.skeletonBlock} />
          <div className={styles.skeletonBlock} />
          <div className={styles.skeletonBlockShort} />
        </div>
      )}
    </div>
  );
}
