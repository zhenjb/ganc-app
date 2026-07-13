// =============================================================================
// Deposit Screen — DepositHistoryList
// -----------------------------------------------------------------------------
// Renders the session-only deposit history using the shared RecordTable.
// Shows an empty state when no deposits have been made yet.
//
// Data is NOT persisted across page reload — managed by the useDepositForm hook.
//
// Requirements: 5.1, 5.2, 5.3
// =============================================================================

import type { DepositHistoryEntry } from "@/app/(pages)/wallet/_types";
import { RecordTable, type ColumnDef } from "@/app/components/RecordTable/RecordTable";
import { shortenHex, formatAmount } from "@/app/lib/services/format";

export interface DepositHistoryListProps {
  entries: DepositHistoryEntry[];
  /** Whether the remote history is still loading. */
  loading?: boolean;
}

/**
 * Safely formats amount+denom, returning "—" on RangeError.
 */
function safeFormatAmount(amount: string, denom: string): string {
  try {
    return formatAmount(amount, denom);
  } catch (err) {
    if (err instanceof RangeError) {
      return "—";
    }
    throw err;
  }
}

/**
 * Column definitions for the deposit history table.
 * Order: ID, Owner Address, Amount, Denom, TxHash, Status.
 */
const DEPOSIT_COLUMNS: ColumnDef<DepositHistoryEntry>[] = [
  {
    key: "id",
    header: "ID",
    render: (entry) => (
      <span
        title={entry.deposit.id}
        style={{
          fontFamily:
            'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
          fontSize: "0.75rem",
        }}
      >
        {entry.deposit.id ? shortenHex(entry.deposit.id) : "—"}
      </span>
    ),
  },
  {
    key: "owner",
    header: "Owner Address",
    render: (entry) => (
      <span
        title={entry.deposit.depositor}
        style={{
          fontFamily:
            'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
          fontSize: "0.8125rem",
        }}
      >
        {shortenHex(entry.deposit.depositor, 10, 6)}
      </span>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    render: (entry) => entry.deposit.amount || "—",
  },
  {
    key: "denom",
    header: "Denom",
    render: (entry) => entry.deposit.denom,
  },
  {
    key: "txHash",
    header: "Tx Hash",
    render: (entry) => (
      <span
        title={entry.deposit.txHash}
        style={{
          fontFamily:
            'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
          fontSize: "0.8125rem",
          color: "var(--color-link, #2563eb)",
        }}
      >
        {entry.deposit.txHash ? shortenHex(entry.deposit.txHash) : "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    align: "center",
    render: (entry) => (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: "9999px",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: entry.deposit.processed ? "#166534" : "#991b1b",
          backgroundColor: entry.deposit.processed
            ? "rgba(22, 163, 74, 0.12)"
            : "rgba(220, 38, 38, 0.12)",
        }}
      >
        {entry.deposit.processed ? "SUCCESSED" : "FAILED"}
      </span>
    ),
  },
];

export function DepositHistoryList({
  entries,
  loading,
}: DepositHistoryListProps): React.JSX.Element {
  return (
    <RecordTable<DepositHistoryEntry>
      title="Deposit History"
      columns={DEPOSIT_COLUMNS}
      data={entries}
      rowKey={(entry) => entry.deposit.id}
      emptyMessage={loading ? "Loading…" : "No deposits yet"}
    />
  );
}

export default DepositHistoryList;
