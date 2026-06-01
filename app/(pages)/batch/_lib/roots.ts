import type { HexString } from "@/app/lib/interfaces/state";
import type { SettlementUpdate } from "@/app/lib/interfaces/batch";

/**
 * Ordered keys of the 4 commitment roots, following their relative order in
 * the locked `SettlementUpdate` sequence
 * (`oldStateRoot, newStateRoot, depositsRoot, withdrawalsRoot, nullifiersRoot,
 * withdrawOutputsRoot`). Used to render the commitment roots in a fixed,
 * deterministic order (Req 7.5).
 */
const COMMITMENT_ROOT_KEYS = [
  "depositsRoot",
  "withdrawalsRoot",
  "nullifiersRoot",
  "withdrawOutputsRoot",
] as const satisfies readonly (keyof SettlementUpdate)[];

/**
 * Determines whether a root value is considered "missing" for display purposes.
 *
 * A root is missing when it is an empty string, `null`, `undefined`, or the
 * placeholder `"0x"`. Any other (non-empty) hex string is treated as present.
 * This predicate drives the red highlight and the text/aria indicator for
 * missing roots (Req 5.8, 7.6, 7.10).
 *
 * @param value - The root value to inspect.
 * @returns `true` if the value is missing, otherwise `false`.
 */
export function isMissingRoot(value: string | null | undefined): boolean {
  return value === "" || value === null || value === undefined || value === "0x";
}

/**
 * Selects the 4 commitment roots from a `SettlementUpdate` in their fixed
 * relative order: `depositsRoot` → `withdrawalsRoot` → `nullifiersRoot` →
 * `withdrawOutputsRoot` (Req 7.5).
 *
 * Values are read dynamically from `publicInputs` — nothing is hardcoded — so
 * the returned values always reflect the actual settlement update.
 *
 * @param publicInputs - The settlement update to read roots from.
 * @returns An ordered array of `{ key, value }` pairs, one per commitment root.
 */
export function selectCommitmentRoots(
  publicInputs: SettlementUpdate
): { key: keyof SettlementUpdate; value: HexString }[] {
  return COMMITMENT_ROOT_KEYS.map((key) => ({
    key,
    value: publicInputs[key],
  }));
}
