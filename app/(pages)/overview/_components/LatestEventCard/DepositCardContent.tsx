// =============================================================================
// DepositCardContent — renders the latest deposit record using RecordTable.
// -----------------------------------------------------------------------------
// Displays: id, shortened depositor, formatted amount, shortened txHash.
// Shows empty state when latestDeposit is null/undefined.
//
// Requirements covered: 4.1, 4.2, 4.4
// =============================================================================

import type { DepositRecord } from "@/app/lib/interfaces/deposit";
import { RecordTable, type ColumnDef } from "@/app/components/RecordTable/RecordTable";
import { formatAmount, shortenHex } from "@/app/lib/services/format";

export interface DepositCardContentProps {
  latestDeposit: DepositRecord | null | undefined;
}

/**
 * Column definitions for the latest deposit table.
 * Order: ID, Owner Address, Amount, Denom, TxHash, Status.
 */
const DEPOSIT_COLUMNS: ColumnDef<DepositRecord>[] = [
  {
    key: "id",
    header: "ID",
    render: (row) => (
      <span
        title={row.id}
        style={{
          fontFamily:
            'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
          fontSize: "0.75rem",
        }}
      >
        {row.id ? shortenHex(row.id) : "—"}
      </span>
    ),
  },
  {
    key: "owner",
    header: "Owner Address",
    render: (row) => (
      <span
        title={row.depositor}
        style={{
          fontFamily:
            'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
          fontSize: "0.8125rem",
        }}
      >
        {shortenHex(row.depositor, 10, 6)}
      </span>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    render: (row) => row.amount || "—",
  },
  {
    key: "denom",
    header: "Denom",
    render: (row) => row.denom,
  },
  {
    key: "txHash",
    header: "Tx Hash",
    render: (row) => (
      <span
        title={row.txHash}
        style={{
          fontFamily:
            'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
          fontSize: "0.8125rem",
          color: "var(--color-link, #2563eb)",
        }}
      >
        {row.txHash ? shortenHex(row.txHash) : "—"}
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
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: "9999px",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: row.processed ? "#166534" : "#991b1b",
          backgroundColor: row.processed
            ? "rgba(22, 163, 74, 0.12)"
            : "rgba(220, 38, 38, 0.12)",
        }}
      >
        {row.processed ? "SUCCESSED" : "FAILED"}
      </span>
    ),
  },
];

export function DepositCardContent({
  latestDeposit,
}: DepositCardContentProps): React.ReactElement {
  const data: DepositRecord[] = latestDeposit ? [latestDeposit] : [];

  return (
    <RecordTable<DepositRecord>
      title="Latest Deposit"
      columns={DEPOSIT_COLUMNS}
      data={data}
      rowKey={(row) => row.id}
      emptyMessage="No deposit yet"
    />
  );
}

export default DepositCardContent;
