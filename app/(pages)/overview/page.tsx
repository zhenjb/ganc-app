"use client";

// =============================================================================
// Overview Page (FE-03) — client shell
// -----------------------------------------------------------------------------
// Thin client shell: reads shared state from AppStateContext, wires up the
// manual Refresh button and auto-polling hook, then delegates all rendering
// to the pure OverviewScreen component.
//
// Requirements: 6.1, 6.2, 6.3, 9.1, 9.2, 9.4, 10.4
// =============================================================================

import { useAppStateContext } from "@/app/lib/contexts/AppStateContext";
import OverviewScreen from "@/app/(pages)/overview/_components/OverviewScreen/OverviewScreen";
import { useOverviewPolling } from "@/app/(pages)/overview/_lib/useOverviewPolling";
import styles from "./page.module.scss";

/**
 * OverviewPage — client shell for /overview.
 *
 * Responsibilities:
 *  1. Read { state, refresh, inFlight } from AppStateContext.
 *  2. Render the manual Refresh button (disabled while in-flight).
 *  3. Kick off auto-polling via useOverviewPolling.
 *  4. Render <OverviewScreen> only when state is non-null.
 */
export default function OverviewPage(): React.JSX.Element {
  const { state, refresh, inFlight } = useAppStateContext();

  // Wire up 5-second auto-polling (skips ticks while inFlight or tab hidden).
  // useOverviewPolling(refresh, inFlight);

  return (
    <div className={styles.page}>
      {/* ── Manual Refresh button ── */}
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={refresh}
          disabled={inFlight}
          aria-disabled={inFlight}
        >
          {inFlight ? (
            <>
              {/* Decorative spinner — hidden from assistive technology */}
              <span
                className={styles.spinner}
                aria-hidden="true"
              />
            </>
          ) : (
            "Refresh"
          )}
        </button>
      </div>

      {/* ── Main content ── */}
      {state != null ? (
        <OverviewScreen state={state} refresh={refresh} inFlight={inFlight} />
      ) : (
        // While the initial fetch is in-flight and no state has arrived yet,
        // render a minimal loading skeleton so the layout does not collapse.
        inFlight && (
          <div className={styles.loadingSkeleton} role="status" aria-live="polite">
            <span className={styles.srOnly}>Loading overview…</span>
          </div>
        )
      )}
    </div>
  );
}
