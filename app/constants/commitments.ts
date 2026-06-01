/**
 * Shared constants for the batch commitment roots (FE-06).
 *
 * The Batch Screen's `CommitmentsCard` renders the 4 commitment roots
 * (`depositsRoot`, `withdrawalsRoot`, `nullifiersRoot`, `withdrawOutputsRoot`)
 * as separate visual blocks, each accompanied by a short English explanation
 * badge. These explanations live here (promoted to `app/constants`) so they are
 * reusable across screens and so each badge's copy has a single source of
 * truth.
 *
 * Every `description` below is pairwise distinct — no two roots share the same
 * explanation text (Req 7.3). All strings are English (product rule).
 *
 * @see ../../.kiro/specs/batch-screen/design.md "CommitmentsCard"
 */

/** The 4 commitment-root keys carried by a `SettlementUpdate` (Req 7.5 order). */
export type CommitmentRootKey =
  | "depositsRoot"
  | "withdrawalsRoot"
  | "nullifiersRoot"
  | "withdrawOutputsRoot";

export interface CommitmentRootExplanation {
  /** Short human-readable title shown as the block heading. */
  label: string;
  /** Distinct English explanation rendered inside the explanation badge. */
  description: string;
}

/**
 * Maps each commitment-root key to its display label and explanation badge
 * text. Keyed by the locked root keys; the rendering order is driven by
 * `selectCommitmentRoots` (not by this object's key order).
 */
export const COMMITMENT_ROOT_EXPLANATIONS: Record<
  CommitmentRootKey,
  CommitmentRootExplanation
> = {
  depositsRoot: {
    label: "Deposits Root",
    description:
      "Commits to every deposit gathered into this batch.",
  },
  withdrawalsRoot: {
    label: "Withdrawals Root",
    description:
      "Commits to every withdrawal request gathered into this batch.",
  },
  nullifiersRoot: {
    label: "Nullifiers Root",
    description:
      "Commits to the nullifiers that stop the batch's withdrawals from being spent twice.",
  },
  withdrawOutputsRoot: {
    label: "Withdraw Outputs Root",
    description:
      "Commits to the payout outputs produced for the batch's withdrawals.",
  },
};
