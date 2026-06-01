// =============================================================================
// Batch Screen (FE-06) — WithdrawalsTable
// -----------------------------------------------------------------------------
// Renders the WithdrawRecord items selected in the BatchInputSelector as a
// table. This is a client component because clicking a shortened hex value
// opens the HexRevealModal (interactive state + clipboard).
//
// Props:
//   - withdrawals: WithdrawRecord[] — the FE records selected by the user
//     (Req 6.4). Data MUST come from the selected FE records, NOT from
//     BatchBuildResponse.
//
// Columns (in order, Req 6.2): id, destination, destinationHash (shortenHex),
// amount (formatAmount), denom, nullifier (shortenHex), status.
// Row count equals withdrawals.length (Req 6.3).
// `amount` is rendered via formatAmount(amount, denom), keeping the original
// decimal string (BigInt-safe) — never cast to number (Req 6.5).
// `destinationHash` and `nullifier` are shortened via shortenHex() (Req 6.6);
// clicking either opens the HexRevealModal with the full value plus copy
// (Req 6.7), whose confirmation disappears within 3s / 3000ms (Req 6.8).
// Empty state (Req 6.9): when withdrawals is empty, an English empty-state
// message is shown and NO data rows are rendered.
//
// Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9
// =============================================================================

"use client";

import { useState } from "react";

import type { HexString } from "@/app/lib/interfaces/state";
import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import { formatAmount, shortenHex } from "@/app/lib/services/format";

import { HexRevealModal } from "@/app/(pages)/batch/_components/HexRevealModal/HexRevealModal";
import styles from "./WithdrawalsTable.module.scss";

// Copy confirmation lifetime for the table-level reveal modal (Req 6.8).
const COPY_CONFIRM_MS = 3000;

export interface WithdrawalsTableProps {
  /** The WithdrawRecord items selected in the BatchInputSelector (Req 6.4). */
  withdrawals: WithdrawRecord[];
}

/** The hex value currently revealed in the modal, or null when closed. */
interface RevealState {
  value: HexString;
  label: string;
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

export function WithdrawalsTable({
  withdrawals,
}: WithdrawalsTableProps): React.JSX.Element {
  // Single reveal target shared by every destinationHash / nullifier cell.
  const [reveal, setReveal] = useState<RevealState | null>(null);

  const isEmpty = withdrawals.length === 0;

  return (
    <section className={styles.container}>
      <h3 className={styles.heading}>Withdrawals in batch</h3>

      {isEmpty ? (
        // Empty state (Req 6.9): English message, no data rows rendered.
        <p className={styles.empty}>No withdrawals selected for this batch.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" className={styles.th}>
                ID
              </th>
              <th scope="col" className={styles.th}>
                Destination
              </th>
              <th scope="col" className={styles.th}>
                Destination hash
              </th>
              <th scope="col" className={styles.th}>
                Amount
              </th>
              <th scope="col" className={styles.th}>
                Denom
              </th>
              <th scope="col" className={styles.th}>
                Nullifier
              </th>
              <th scope="col" className={styles.th}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((withdrawal) => (
              // One row per selected WithdrawRecord (Req 6.2, 6.3), columns in
              // order: id, destination, destinationHash, amount, denom,
              // nullifier, status.
              <tr key={withdrawal.id} className={styles.row}>
                <td className={`${styles.td} ${styles.mono}`}>
                  {withdrawal.id}
                </td>
                <td className={`${styles.td} ${styles.mono}`}>
                  {withdrawal.destination}
                </td>
                {/* Shortened destinationHash — click reveals full value (Req 6.6, 6.7). */}
                <td className={styles.td}>
                  <button
                    type="button"
                    className={styles.hexButton}
                    title={withdrawal.destinationHash}
                    onClick={() =>
                      setReveal({
                        value: withdrawal.destinationHash,
                        label: "Destination hash",
                      })
                    }
                  >
                    {shortenHex(withdrawal.destinationHash)}
                  </button>
                </td>
                {/* BigInt-safe formatting — never cast to number (Req 6.5). */}
                <td className={styles.td}>
                  {safeFormatAmount(withdrawal.amount, withdrawal.denom)}
                </td>
                <td className={styles.td}>{withdrawal.denom}</td>
                {/* Shortened nullifier — click reveals full value (Req 6.6, 6.7). */}
                <td className={styles.td}>
                  <button
                    type="button"
                    className={styles.hexButton}
                    title={withdrawal.nullifier}
                    onClick={() =>
                      setReveal({
                        value: withdrawal.nullifier,
                        label: "Nullifier",
                      })
                    }
                  >
                    {shortenHex(withdrawal.nullifier)}
                  </button>
                </td>
                <td className={styles.td}>{withdrawal.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Full-value reveal with copy; confirmation disappears within 3s (Req 6.7, 6.8). */}
      <HexRevealModal
        open={reveal !== null}
        value={reveal?.value ?? ""}
        label={reveal?.label ?? ""}
        copyConfirmMs={COPY_CONFIRM_MS}
        onClose={() => setReveal(null)}
      />
    </section>
  );
}

export default WithdrawalsTable;
