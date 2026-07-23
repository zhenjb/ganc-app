"use client";

import { useWalletContext } from "@/app/lib/contexts/WalletContext";
import { TradeScreen } from "@/app/(pages)/trade/_components/TradeScreen/TradeScreen";
import styles from "./page.module.scss";

export default function TradePage(): React.JSX.Element {
  const { address } = useWalletContext();

  return (
    <div className={styles.page}>
      <TradeScreen owner={address ?? ""} />
    </div>
  );
}
