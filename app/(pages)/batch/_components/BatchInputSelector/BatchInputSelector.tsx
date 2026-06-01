// =============================================================================
// Batch Screen (FE-06) — BatchInputSelector
// -----------------------------------------------------------------------------
// Controlled multi-select for the deposits and withdraws to include in the next
// batch build. This is a client component because the checkboxes drive
// interactive selection state owned by the parent (BatchScreen).
//
// Props:
//   - availableDeposits: DepositRecord[]   — selectable deposits (Req 2.1).
//   - availableWithdraws: WithdrawRecord[] — selectable pending withdraws,
//     already filtered to status === "pending" by the caller (Req 2.2).
//   - selection: BatchSelectionState       — the single source of truth for
//     which ids are checked. The component is fully controlled (Req 2.7).
//   - disabled: boolean                     — disables every checkbox; true when
//     app state is null or a build is in flight.
//   - partialWarning: boolean               — show the partial-batch warning
//     (Req 4.2) when true; hide it otherwise (Req 4.3).
//   - onChange: (next) => void              — emitted on every toggle.
//
// Behavior:
//   - All checkboxes initialize UNCHECKED because `selection` starts with two
//     empty arrays (Req 2.7); checked state is derived purely from `selection`.
//   - Two separate counts are shown: selectedDepositIds.length and
//     selectedWithdrawIds.length (Req 2.3).
//   - A JSON preview of buildBatchPayload(selection) is rendered via
//     previewJson(...) (2-space indent) in a monospace block, using the exact
//     field names pendingDepositIds / pendingWithdrawIds (Req 2.4, 2.5).
//   - Withdraws are labeled with `destination` and `destinationHash`; the string
//     "withdrawAddress" is never shown (Req 2.6).
//   - Empty state (Req 2.8): when there are no available deposits AND no
//     available pending withdraws, an English empty-state message is shown while
//     the JSON preview still renders with both arrays empty.
//
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.2, 4.3
// =============================================================================

"use client";

import type { DepositRecord } from "@/app/lib/interfaces/deposit";
import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import { formatAmount, shortenHex } from "@/app/lib/services/format";

import { buildBatchPayload, previewJson } from "@/app/(pages)/batch/_lib/payload";
import type { BatchSelectionState } from "@/app/(pages)/batch/_types";

import styles from "./BatchInputSelector.module.scss";

export interface BatchInputSelectorProps {
  /** Selectable deposits (Req 2.1). */
  availableDeposits: DepositRecord[];
  /** Selectable withdraws — only status === "pending" (Req 2.2). */
  availableWithdraws: WithdrawRecord[];
  /** Controlled selection state; arrays start empty (Req 2.7). */
  selection: BatchSelectionState;
  /** Disables every checkbox (true when state == null or building). */
  disabled: boolean;
  /** Show the partial-batch warning (Req 4.2 / 4.3). */
  partialWarning: boolean;
  /** Emitted with the next selection on every toggle. */
  onChange: (next: BatchSelectionState) => void;
}

/**
 * Formats an amount+denom pair via formatAmount, returning "—" on RangeError so
 * a single malformed record never crashes the selector.
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
 * Toggle an id within a list: add it when absent, remove it when present.
 * Returns a new array (never mutates the input) so the controlled selection
 * update stays referentially clean.
 */
function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

export function BatchInputSelector({
  availableDeposits,
  availableWithdraws,
  selection,
  disabled,
  partialWarning,
  onChange,
}: BatchInputSelectorProps): React.JSX.Element {
  // Derive the JSON preview from the current selection. The payload always
  // contains exactly pendingDepositIds / pendingWithdrawIds (Req 2.5), and the
  // preview still renders when both are empty (Req 2.8).
  const payload = buildBatchPayload(selection);
  const json = previewJson(payload);

  const depositCount = selection.selectedDepositIds.length;
  const withdrawCount = selection.selectedWithdrawIds.length;

  // Empty state applies only when BOTH sides have no available records (Req 2.8).
  const noInputs =
    availableDeposits.length === 0 && availableWithdraws.length === 0;

  function handleToggleDeposit(id: string): void {
    onChange({
      selectedDepositIds: toggleId(selection.selectedDepositIds, id),
      selectedWithdrawIds: selection.selectedWithdrawIds,
    });
  }

  function handleToggleWithdraw(id: string): void {
    onChange({
      selectedDepositIds: selection.selectedDepositIds,
      selectedWithdrawIds: toggleId(selection.selectedWithdrawIds, id),
    });
  }

  return (
    <section className={styles.container} aria-label="Batch input selector">
      {/* Two separate counts (Req 2.3). */}
      <div className={styles.counts}>
        <span className={styles.count}>
          Deposits selected: <strong>{depositCount}</strong>
        </span>
        <span className={styles.count}>
          Withdraws selected: <strong>{withdrawCount}</strong>
        </span>
      </div>

      {noInputs ? (
        // Empty state (Req 2.8): English message; the JSON preview below still
        // renders with both arrays empty.
        <p className={styles.empty}>
          No pending deposits or withdraws are available to batch.
        </p>
      ) : (
        <div className={styles.columns}>
          {/* Deposits multi-select (Req 2.1). */}
          <fieldset className={styles.group} disabled={disabled}>
            <legend className={styles.legend}>Deposits</legend>
            {availableDeposits.length === 0 ? (
              <p className={styles.groupEmpty}>No deposits available.</p>
            ) : (
              <ul className={styles.list}>
                {availableDeposits.map((deposit) => (
                  <li key={deposit.id} className={styles.item}>
                    <label className={styles.option}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        // Checked state derived purely from selection (Req 2.7).
                        checked={selection.selectedDepositIds.includes(
                          deposit.id
                        )}
                        disabled={disabled}
                        onChange={() => handleToggleDeposit(deposit.id)}
                      />
                      <span className={styles.optionBody}>
                        <span className={`${styles.optionId} ${styles.mono}`}>
                          {deposit.id}
                        </span>
                        <span className={styles.optionMeta}>
                          <span className={styles.mono}>
                            {deposit.depositor}
                          </span>
                          {" · "}
                          {safeFormatAmount(deposit.amount, deposit.denom)}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>

          {/* Withdraws multi-select (Req 2.2). Labels use destination and
              destinationHash; "withdrawAddress" is never shown (Req 2.6). */}
          <fieldset className={styles.group} disabled={disabled}>
            <legend className={styles.legend}>Withdraws</legend>
            {availableWithdraws.length === 0 ? (
              <p className={styles.groupEmpty}>No pending withdraws available.</p>
            ) : (
              <ul className={styles.list}>
                {availableWithdraws.map((withdraw) => (
                  <li key={withdraw.id} className={styles.item}>
                    <label className={styles.option}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        // Checked state derived purely from selection (Req 2.7).
                        checked={selection.selectedWithdrawIds.includes(
                          withdraw.id
                        )}
                        disabled={disabled}
                        onChange={() => handleToggleWithdraw(withdraw.id)}
                      />
                      <span className={styles.optionBody}>
                        <span className={`${styles.optionId} ${styles.mono}`}>
                          {withdraw.id}
                        </span>
                        <span className={styles.optionMeta}>
                          <span className={styles.fieldLabel}>destination</span>{" "}
                          <span className={styles.mono}>
                            {withdraw.destination}
                          </span>
                          {" · "}
                          <span className={styles.fieldLabel}>
                            destinationHash
                          </span>{" "}
                          <span
                            className={styles.mono}
                            title={withdraw.destinationHash}
                          >
                            {shortenHex(withdraw.destinationHash)}
                          </span>
                          {" · "}
                          {safeFormatAmount(withdraw.amount, withdraw.denom)}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        </div>
      )}

      {/* Partial-batch warning (Req 4.2); hidden otherwise (Req 4.3). */}
      {partialWarning && (
        <p className={styles.warning} role="alert">
          Backend may reject a partial batch.
        </p>
      )}

      {/* JSON preview of the BatchBuildInput payload (Req 2.4, 2.5). Always
          rendered, including the empty-state case (Req 2.8). */}
      <div className={styles.preview}>
        <span className={styles.previewLabel}>Payload preview</span>
        <pre className={styles.json}>{json}</pre>
      </div>
    </section>
  );
}

export default BatchInputSelector;
