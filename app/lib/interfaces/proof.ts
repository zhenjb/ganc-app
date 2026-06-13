import type { HexString, ProofStatus } from "./state";
import type { SettlementUpdate, BatchCommitments, Witness } from "./batch";

/**
 * Proof + the public inputs the proof was generated against.
 *
 * `publicInputs` is a fixed-length tuple of 6 HexStrings in the locked order:
 * [oldStateRoot, newStateRoot, depositsRoot, withdrawalsRoot,
 *  nullifiersRoot, withdrawOutputsRoot] (Req 6.5).
 */
export interface ProofBundle {
  proof: HexString;
  publicInputs: [HexString, HexString, HexString, HexString, HexString, HexString];
  verificationKeyId: string;
}

/**
 * Input payload for POST /api/proof/generate.
 *
 * Contains the three prover inputs read from BatchSessionContext.
 */
export interface ProofGenerateInput {
  settlementUpdate: SettlementUpdate;
  batchCommitments: BatchCommitments;
  witness: Witness;
}

/**
 * Response shape from POST /api/proof/generate.
 */
export interface ProofGenerateResponse {
  proofBundle: ProofBundle;
  state: {
    proofStatus: ProofStatus;
  };
}
