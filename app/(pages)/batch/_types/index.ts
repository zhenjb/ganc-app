/**
 * Page-private selection state for the Batch screen (FE-06).
 *
 * Tracks which pending deposits and withdraws the user has chosen to include
 * in the next batch build. Holds only domain `id` references; the full
 * `DepositRecord` / `WithdrawRecord` objects are resolved from app state and
 * client-side session history at render time.
 *
 * This type is intentionally local to the batch page (`_types/`) and MUST NOT
 * be imported by modules outside the batch page directory.
 */
export interface BatchSelectionState {
  /** Selected `DepositRecord.id` values, in user-selection order. */
  selectedDepositIds: string[];
  /** Selected `WithdrawRecord.id` values, in user-selection order. */
  selectedWithdrawIds: string[];
}
