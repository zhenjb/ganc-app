// =============================================================================
// WithdrawRequestHistory — session-scoped list of withdraw requests.
// -----------------------------------------------------------------------------
// Renders all withdraw requests using the shared RecordTable component.
// Each entry shows: shortened id, amount + denom, status badge, and timestamp.
//
// Persistence (sessionStorage) is handled by sessionHistory.ts + the form hook;
// this component is purely presentational.
//
// Requirements covered: 5.1, 5.2, 5.3
// =============================================================================

import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import { RecordTable, type ColumnDef } from "@/app/components/RecordTable/RecordTable";
import { formatAmount } from "@/app/lib/services/format";
import styles from "./WithdrawRequestHistory.module.scss";

export interface WithdrawRequestHistoryProps {
  entries: WithdrawRecord[];
  /** When provided, an Action column with a Claim button is shown for
   *  not-yet-claimed withdrawals. Clicking claims the on-chain payout. */
  onClaim?: (record: WithdrawRecord) => void;
  /** id of the withdrawal currently being claimed (disables its button). */
  claimingId?: string | null;
}

/**
 * Maps a WithdrawRecord status to its corresponding badge style class.
 */
const STATUS_CLASS: Record<WithdrawRecord["status"], string> = {
  pending: styles.statusPending,
  processed: styles.statusProcessed,
  claimed: styles.statusClaimed,
  rejected: styles.statusRejected,
};

/**
 * Formats an ISO 8601 timestamp into a human-readable local string.
 * Falls back to the raw value on parse failure.
 */
function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

/**
 * Safely formats amount+denom, returning "—" on RangeError (invalid amount).
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
 * Visually truncates a UUID for compact display.
 */
function shortenId(id: string): string {
  if (id.length <= 13) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

/**
 * Column definitions for the withdraw request history table.
 */
const WITHDRAW_COLUMNS: ColumnDef<WithdrawRecord>[] = [
  {
    key: "id",
    header: "ID",
    render: (entry) => (
      <span
        title={entry.id}
        style={{
          fontFamily:
            'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
          fontSize: "0.8125rem",
          color: "var(--color-link, #2563eb)",
          cursor: "help",
        }}
      >
        {shortenId(entry.id)}
      </span>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    render: (entry) => safeFormatAmount(entry.amount, entry.denom),
  },
  {
    key: "status",
    header: "Status",
    align: "center",
    render: (entry) => (
      <span className={`${styles.statusBadge} ${STATUS_CLASS[entry.status]}`}>
        {entry.status}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Time",
    align: "right",
    render: (entry) => (
      <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
        {formatTimestamp(entry.createdAt)}
      </span>
    ),
  },
];

export function WithdrawRequestHistory({
  entries,
  onClaim,
  claimingId,
}: WithdrawRequestHistoryProps): React.JSX.Element {
  // Append a Claim action column only when a handler is wired. A withdrawal is
  // claimable until it is claimed (or rejected); the button waits for on-chain
  // settlement internally, so it is safe to show as soon as the request exists.
  const columns: ColumnDef<WithdrawRecord>[] = onClaim
    ? [
        ...WITHDRAW_COLUMNS,
        {
          key: "action",
          header: "Action",
          align: "center",
          render: (entry) => {
            if (entry.status === "claimed") {
              return <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>✓ claimed</span>;
            }
            if (entry.status === "rejected") {
              return <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>—</span>;
            }
            const busy = claimingId === entry.id;
            return (
              <button
                type="button"
                onClick={() => onClaim(entry)}
                disabled={busy || claimingId != null}
                style={{
                  fontSize: "0.75rem",
                  padding: "3px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-link, #2563eb)",
                  background: busy ? "#e5e7eb" : "var(--color-link, #2563eb)",
                  color: busy ? "#6b7280" : "#fff",
                  cursor: busy || claimingId != null ? "not-allowed" : "pointer",
                  fontWeight: 700,
                }}
              >
                {busy ? "Claiming…" : "Claim"}
              </button>
            );
          },
        },
      ]
    : WITHDRAW_COLUMNS;

  return (
    <RecordTable<WithdrawRecord>
      title="Withdraw Request History"
      columns={columns}
      data={entries}
      rowKey={(entry) => entry.id}
      emptyMessage="No withdraw requests yet"
    />
  );
}

export default WithdrawRequestHistory;
