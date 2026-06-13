/**
 * Fixed-order labels for the 6 public inputs of a settlement proof.
 *
 * The order MUST match the tuple layout in ProofBundle.publicInputs (Req 6.5).
 */
export const PUBLIC_INPUT_LABELS = [
  "oldStateRoot",
  "newStateRoot",
  "depositsRoot",
  "withdrawalsRoot",
  "nullifiersRoot",
  "withdrawOutputsRoot",
] as const;

export type PublicInputLabel = (typeof PUBLIC_INPUT_LABELS)[number];
