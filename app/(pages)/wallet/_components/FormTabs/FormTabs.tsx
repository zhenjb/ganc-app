// =============================================================================
// Deposit Page — FormTabs
// -----------------------------------------------------------------------------
// Tab switcher between Deposit and Withdraw forms.
// UI: pill-shaped tab bar at the top, renders the active form panel below.
// =============================================================================

"use client";

import { useState } from "react";
import styles from "./FormTabs.module.scss";

export type TabId = "deposit" | "withdraw";

export interface FormTabsProps {
  depositContent: React.ReactNode;
  withdrawContent: React.ReactNode;
  /** Called when the active tab changes. */
  onTabChange?: (tab: TabId) => void;
}

export function FormTabs({
  depositContent,
  withdrawContent,
  onTabChange,
}: FormTabsProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>("deposit");

  const handleTabClick = (tab: TabId) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className={styles.card}>
      {/* Tab bar */}
      <div className={styles.tabsContainer} role="tablist" aria-label="Form tabs">
        <button
          type="button"
          role="tab"
          id="tab-deposit"
          aria-selected={activeTab === "deposit"}
          aria-controls="panel-deposit"
          className={`${styles.tab} ${activeTab === "deposit" ? styles.tabActiveDeposit : ""}`}
          onClick={() => handleTabClick("deposit")}
        >
          Deposit
        </button>
        <button
          type="button"
          role="tab"
          id="tab-withdraw"
          aria-selected={activeTab === "withdraw"}
          aria-controls="panel-withdraw"
          className={`${styles.tab} ${activeTab === "withdraw" ? styles.tabActiveWithdraw : ""}`}
          onClick={() => handleTabClick("withdraw")}
        >
          Withdraw
        </button>
      </div>

      {/* Tab panels */}
      <div
        id="panel-deposit"
        role="tabpanel"
        aria-labelledby="tab-deposit"
        className={styles.tabPanel}
        hidden={activeTab !== "deposit"}
      >
        {activeTab === "deposit" && depositContent}
      </div>
      <div
        id="panel-withdraw"
        role="tabpanel"
        aria-labelledby="tab-withdraw"
        className={styles.tabPanel}
        hidden={activeTab !== "withdraw"}
      >
        {activeTab === "withdraw" && withdrawContent}
      </div>
    </div>
  );
}

export default FormTabs;
