// =============================================================================
// WithdrawCardContent — renders the latest withdraw record using RecordTable.
// -----------------------------------------------------------------------------
// Displays: id, shortened destination, formatted amount, shortened nullifier,
// and status. Shows empty state when latestWithdraw is null/undefined.
//
// Requirements covered: 4.3, 4.4, 4.6
// =============================================================================

import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import { RecordTable, type ColumnDef } from "@/app/components/RecordTable/RecordTable";
import { formatAmount, shortenHex } from "@/app/lib/services/format";

export interface WithdrawCardContentProps {
  latestWithdraw: WithdrawRecord | null | undefined;
}

/**
 * Shorten a destination address for compact display.
 */
function shortenDestination(address: string | undefined): string {
  return address && address.length > 0
    ? `${address.slice(0, 10)}…${address.slice(-4)}`
    : "—";
}

/**
 * Column definitions for the latest withdraw table.
 */
const WITHDRAW_COLUMNS: ColumnDef<WithdrawRecord>[] = [
  {
    key: "id",
    header: "ID",
    render: (row) => row.id,
  },
  {
    key: "destination",
    header: "Destination",
    render: (row) => shortenDestination(row.destination),
  },
  {
    key: "amount",
    header: "Amount",
    render: (row) => formatAmount(row.amount, row.denom),
  },
  {
    key: "nullifier",
    header: "Nullifier",
    render: (row) => (
      <span
        title={row.nullifier}
        style={{
          fontFamily:
            'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
          fontSize: "0.8125rem",
        }}
      >
        {shortenHex(row.nullifier, 6, 4)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    align: "center",
    render: (row) => (
      <span
        style={{
          textTransform: "capitalize",
          fontWeight: 500,
        }}
      >
        {row.status}
      </span>
    ),
  },
];

export function WithdrawCardContent({
  latestWithdraw,
}: WithdrawCardContentProps): React.ReactElement {
  const data: WithdrawRecord[] = latestWithdraw ? [latestWithdraw] : [];

  return (
    <RecordTable<WithdrawRecord>
      title="Latest Withdraw"
      columns={WITHDRAW_COLUMNS}
      data={data}
      rowKey={(row) => row.id}
      emptyMessage="No withdraw yet"
    />
  );
}

export default WithdrawCardContent;
