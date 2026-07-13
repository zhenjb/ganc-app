"use client";

// =============================================================================
// Trade Page — client shell for /trade
// -----------------------------------------------------------------------------
// Thin client shell: reads owner from a hard-coded default (to be replaced by
// real wallet connection), then delegates all rendering to TradeScreen.
// =============================================================================

import { TradeScreen } from "@/app/(pages)/trade/_components/TradeScreen/TradeScreen";
import styles from "./page.module.scss";

/**
 * Default owner address used for API calls.
 * In a production app, this would come from wallet connection state.
 */
const DEFAULT_OWNER = "cosmos1alice";

export default function TradePage(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <TradeScreen owner={DEFAULT_OWNER} />
    </div>
  );
}
