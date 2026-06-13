// =============================================================================
// Proof Page (FE-07) — client shell
// -----------------------------------------------------------------------------
// Thin client shell for /proof. Reads the shared app state from
// AppStateContext and decides what to render:
//
//   1. error !== null → single NormalizedError banner; ProofScreen is NOT
//      mounted (Req 1.1).
//   2. state === null → loading skeleton inside a role="status" /
//      aria-live="polite" region with a screen-reader label "Loading proof…".
//      ProofScreen is not rendered at all.
//   3. state !== null → delegate to <ProofScreen> (Req 2.7).
//
// The shell never calls `fetch` directly; it only reads via the context.
// It renders inside the existing (pages) route group / App Shell, so no extra
// provider wiring is needed here.
//
// Requirements: 1.1, 2.7
// =============================================================================

"use client";

import { useAppStateContext } from "@/app/lib/contexts/AppStateContext";
import { AnnouncementBanner } from "@/app/components/AnnouncementBanner/AnnouncementBanner";
import { ProofScreen } from "@/app/(pages)/proof/_components/ProofScreen/ProofScreen";
import styles from "./page.module.scss";

/** English UI strings (English-only UI per product rules). */
const NORMALIZED_ERROR = "Internal Server Error";

/**
 * ProofPage — client shell for /proof.
 *
 * Responsibilities:
 *  1. Read { state, refresh, inFlight, error } from AppStateContext.
 *  2. Render the NormalizedError banner when the state fetch failed.
 *  3. Render a loading skeleton while state is null.
 *  4. Render <ProofScreen> when state is ready.
 */
export default function ProofPage(): React.JSX.Element {
  const { state, refresh, inFlight, error } = useAppStateContext();

  return (
    <div className={styles.page}>
      {error !== null ? (
        // NormalizedError surface — ProofScreen NOT mounted (Req 1.1).
        <AnnouncementBanner variant="error" message={NORMALIZED_ERROR} />
      ) : state !== null ? (
        // State ready — delegate to the orchestrator (Req 2.7).
        <ProofScreen state={state} refresh={refresh} inFlight={inFlight} />
      ) : (
        // State still loading — skeleton in a polite live region.
        <div
          className={styles.loadingSkeleton}
          role="status"
          aria-live="polite"
        >
          <span className={styles.srOnly}>Loading proof…</span>
          <div className={styles.skeletonBlock} />
          <div className={styles.skeletonBlock} />
          <div className={styles.skeletonBlockShort} />
        </div>
      )}
    </div>
  );
}
