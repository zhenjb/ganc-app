// =============================================================================
// Wallet Screen — UserBalancePanel
// -----------------------------------------------------------------------------
// Composes UserBalanceCard and ModuleBalanceCard side by side (or stacked on
// mobile). Acts as the single import point used by DepositScreen.
// =============================================================================

"use client";

import type { AppState } from "@/app/lib/interfaces/state";
import { useWalletContext } from "@/app/lib/contexts/WalletContext";
import { UserBalanceCard } from "@/app/(pages)/wallet/_components/UserBalanceCard/UserBalanceCard";
import { ModuleBalanceCard } from "@/app/(pages)/wallet/_components/ModuleBalanceCard/ModuleBalanceCard";
import styles from "./UserBalancePanel.module.scss";

export interface UserBalancePanelProps {
  state: AppState;
}

export function UserBalancePanel({ state }: UserBalancePanelProps): React.JSX.Element {
  const { address } = useWalletContext();
  return (
    <div className={styles.panel}>
      <UserBalanceCard userBalances={state.userBalances} owner={address} />
      <ModuleBalanceCard moduleBalances={state.moduleAccountBalance} />
    </div>
  );
}

export default UserBalancePanel;
