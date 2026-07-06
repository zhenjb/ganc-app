// =============================================================================
// DepositCardContent — renders the latest deposit record inside a LatestEventCard.
// -----------------------------------------------------------------------------
// Displays: id, shortened depositor address, formatted amount, shortened txHash.
// Shows empty state when latestDeposit is null/undefined.
//
// Requirements covered: 4.1, 4.2, 4.4
// =============================================================================

import type { DepositRecord } from "@/app/lib/interfaces/deposit";
import { formatAmount, shortenHex } from "@/app/lib/services/format";
import { LatestEventCard } from "./LatestEventCard";

export interface DepositCardContentProps {
  latestDeposit: DepositRecord | null | undefined;
}

export function DepositCardContent({
  latestDeposit,
}: DepositCardContentProps): React.ReactElement {
  const shortenDepositor = (address: string | undefined): string =>
    address && address.length > 0
      ? `${address.slice(0, 10)}…${address.slice(-4)}`
      : "—";

  return (
    <LatestEventCard
      title="Latest Deposit"
      isEmpty={!latestDeposit}
      emptyMessage="No deposit yet"
    >
      {latestDeposit != null && (
        <dl>
          <div>
            <dt>ID</dt>
            <dd>{latestDeposit.id}</dd>
          </div>
          <div>
            <dt>Depositor</dt>
            <dd>{shortenDepositor(latestDeposit.depositor)}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{formatAmount(latestDeposit.amount, latestDeposit.denom)}</dd>
          </div>
          <div>
            <dt>Tx Hash</dt>
            <dd>{shortenHex(latestDeposit.txHash, 6, 4)}</dd>
          </div>
        </dl>
      )}
    </LatestEventCard>
  );
}

export default DepositCardContent;
