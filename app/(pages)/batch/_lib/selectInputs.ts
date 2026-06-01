import type { DepositRecord, WithdrawRecord } from "@/app/lib/interfaces";

/**
 * Build the set of deposits available for batching.
 *
 * The available set is the union of the latest deposit reported by app state
 * (when present) and the FE-04 session history, ordered as `[latest, ...history]`.
 * Duplicate records sharing the same `id` are removed, keeping the first
 * occurrence in that order so the latest deposit wins over older history entries.
 *
 * @param latest - The latest deposit from app state, or null/undefined when absent.
 * @param history - Session history of deposit records (FE-04).
 * @returns Deduplicated deposits, first occurrence preserved.
 */
export function selectAvailableDeposits(
  latest: DepositRecord | null | undefined,
  history: DepositRecord[]
): DepositRecord[] {
  const union = latest ? [latest, ...history] : [...history];
  return dedupeById(union);
}

/**
 * Build the set of pending withdraws available for batching.
 *
 * Only records with `status === "pending"` are considered. The available set is
 * the union of the latest withdraw from app state (when present) and the FE-05
 * session history, ordered as `[latest, ...history]`. Duplicate records sharing
 * the same `id` are removed, keeping the first occurrence in that order.
 *
 * @param latest - The latest withdraw from app state, or null/undefined when absent.
 * @param history - Session history of withdraw records (FE-05).
 * @returns Deduplicated pending withdraws, first occurrence preserved.
 */
export function selectAvailableWithdraws(
  latest: WithdrawRecord | null | undefined,
  history: WithdrawRecord[]
): WithdrawRecord[] {
  const union = latest ? [latest, ...history] : [...history];
  const pending = union.filter((record) => record.status === "pending");
  return dedupeById(pending);
}

/**
 * Remove records that share an `id` with an earlier record, keeping the first
 * occurrence encountered while iterating in order.
 */
function dedupeById<T extends { id: string }>(records: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const record of records) {
    if (seen.has(record.id)) {
      continue;
    }
    seen.add(record.id);
    result.push(record);
  }
  return result;
}
