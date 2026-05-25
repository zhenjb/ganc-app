// =============================================================================
// WithdrawCardContent — renders the latest withdraw record inside a LatestEventCard.
// -----------------------------------------------------------------------------
// Displays: id, shortened destination address, formatted amount, shortened
// nullifier, and raw status string.
// Shows empty state when latestWithdraw is null/undefined.
//
// Requirements covered: 4.3, 4.4, 4.6
// =============================================================================

import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import { formatAmount, shortenHex } from "@/app/lib/services/format";
import { LatestEventCard } from "./LatestEventCard";

export interface WithdrawCardContentProps {
  latestWithdraw: WithdrawRecord | null | undefined;
}

export function WithdrawCardContent({
  latestWithdraw,
}: WithdrawCardContentProps): React.ReactElement {
  const shortenDestination = (address: string): string =>
    `${address.slice(0, 10)}…${address.slice(-4)}`;

  return (
    <LatestEventCard
      title="Latest Withdraw"
      isEmpty={!latestWithdraw}
      emptyMessage="No withdraw yet"
    >
      {latestWithdraw != null && (
        <dl>
          <div>
            <dt>ID</dt>
            <dd>{latestWithdraw.id}</dd>
          </div>
          <div>
            <dt>Destination</dt>
            <dd>{shortenDestination(latestWithdraw.destination)}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{formatAmount(latestWithdraw.amount, latestWithdraw.denom)}</dd>
          </div>
          <div>
            <dt>Nullifier</dt>
            <dd>{shortenHex(latestWithdraw.nullifier, 6, 4)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{latestWithdraw.status}</dd>
          </div>
        </dl>
      )}
    </LatestEventCard>
  );
}

export default WithdrawCardContent;
