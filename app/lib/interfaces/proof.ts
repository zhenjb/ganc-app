import type { HexString } from "./state";
import type { Witness, BatchCommitments } from "./batch";

/**
 * Proof + the public inputs the proof was generated against.
 *
 * `publicInputs` reuses `BatchCommitments["publicInputs"]` so the locked
 * 6-field order (`oldStateRoot, newStateRoot, depositsRoot, withdrawalsRoot,
 * nullifiersRoot, withdrawOutputsRoot`) has a single source of truth (Req 2.12).
 */
export interface ProofBundle {
  proof: HexString;
  publicInputs: BatchCommitments["publicInputs"];
}

export interface ProofGenerateInput {
  commitments: BatchCommitments;
  witness: Witness;
}

export interface ProofGenerateResponse {
  bundle: ProofBundle;
}
