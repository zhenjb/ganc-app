"use client";

// =============================================================================
// Trade Page — client shell for /trade
// -----------------------------------------------------------------------------
// Thin client shell: reads owner from AppState.userBalances (first key),
// then delegates all rendering to TradeScreen.
// =============================================================================

import { useAppStateContext } from "@/app/lib/contexts/AppStateContext";
import { TradeScreen } from "@/app/(pages)/trade/_components/TradeScreen/TradeScreen";
import styles from "./page.module.scss";

/**
 * Fallback owner address used when no balance exists in state yet.
 */
const FALLBACK_OWNER = "cosmos1alice";

/**
 * Extract the owner address from the first key in userBalances.
 * Keys are formatted as "{address}/{denom}".
 */
function parseOwnerFromState(userBalances: Record<string, string> | undefined): string {
  if (!userBalances) return FALLBACK_OWNER;
  const firstKey = Object.keys(userBalances)[0];
  if (!firstKey) return FALLBACK_OWNER;
  const slashIdx = firstKey.indexOf("/");
  if (slashIdx === -1) return FALLBACK_OWNER;
  return firstKey.slice(0, slashIdx) || FALLBACK_OWNER;
}

export default function TradePage(): React.JSX.Element {
  const { state } = useAppStateContext();
  const owner = parseOwnerFromState(state?.userBalances);

  return (
    <div className={styles.page}>
      <TradeScreen owner={owner} />
    </div>
  );
}
