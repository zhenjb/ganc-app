"use client";

// =============================================================================
// Overview Page — DEX Landing / Hero screen
// -----------------------------------------------------------------------------
// Rebuilt as a visually rich landing page showcasing the ZKDEX platform
// with background imagery and key feature highlights.
// =============================================================================

import OverviewScreen from "@/app/(pages)/overview/_components/OverviewScreen/OverviewScreen";
import styles from "./page.module.scss";

export default function OverviewPage(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <OverviewScreen />
    </div>
  );
}
