// =============================================================================
// Batch Screen (FE-06) — DepositsTable
// -----------------------------------------------------------------------------
// Renders the DepositRecord items selected in the BatchInputSelector as a table.
//
// Props:
//   - deposits: DepositRecord[] — the FE records selected by the user (Req 6.4).
//     Data MUST come from the selected FE records, NOT from BatchBuildResponse.
//
// Columns (in order, Req 6.1): id, depositor, amount, denom.
// Row count equals deposits.length (Req 6.3).
// `amount` is rendered via formatAmount(amount, denom), keeping the original
// decimal string (BigInt-safe) — never cast to number (Req 6.5).
// Empty state (Req 6.9): when deposits is empty, an English empty-state message
// is shown and NO data rows are rendered.
//
// Requirements: 6.1, 6.3, 6.4, 6.5, 6.9
// =============================================================================

import type { DepositRecord } from "@/app/lib/interfaces/deposit";
import { formatAmount } from "@/app/lib/services/format";
import styles from "./DepositsTable.module.scss";

export interface DepositsTableProps {
  /** The DepositRecord items selected in the BatchInputSelector (Req 6.4). */
  deposits: DepositRecord[];
}

/**
 * Formats an amount+denom pair via formatAmount, returning "—" on RangeError so
 * a single malformed record never crashes the whole table.
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

export function DepositsTable({
  deposits,
}: DepositsTableProps): React.JSX.Element {
  const isEmpty = deposits.length === 0;

  return (
    <section className={styles.container}>
      <h3 className={styles.heading}>Deposits in batch</h3>

      {isEmpty ? (
        // Empty state (Req 6.9): English message, no data rows rendered.
        <p className={styles.empty}>No deposits selected for this batch.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" className={styles.th}>
                ID
              </th>
              <th scope="col" className={styles.th}>
                Depositor
              </th>
              <th scope="col" className={styles.th}>
                Amount
              </th>
              <th scope="col" className={styles.th}>
                Denom
              </th>
            </tr>
          </thead>
          <tbody>
            {deposits.map((deposit) => (
              // One row per selected DepositRecord (Req 6.1, 6.3).
              <tr key={deposit.id} className={styles.row}>
                <td className={`${styles.td} ${styles.mono}`}>{deposit.id}</td>
                <td className={`${styles.td} ${styles.mono}`}>
                  {deposit.depositor}
                </td>
                {/* BigInt-safe formatting — never cast to number (Req 6.5). */}
                <td className={styles.td}>
                  {safeFormatAmount(deposit.amount, deposit.denom)}
                </td>
                <td className={styles.td}>{deposit.denom}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default DepositsTable;
