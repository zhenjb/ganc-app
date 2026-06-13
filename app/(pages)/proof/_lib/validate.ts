import type { ProofBundle } from "@/app/lib/interfaces/proof";
import type { ProofValidation } from "../_types";

/**
 * Validates a ProofBundle before storing it in session.
 *
 * - emptyProof: proof is falsy ("") or just the "0x" prefix
 * - invalidInputs: publicInputs does not have exactly 6 elements
 * - valid: true only when both checks pass
 */
export function validateProofBundle(bundle: ProofBundle): ProofValidation {
  const emptyProof = !bundle.proof || bundle.proof === "0x";
  const invalidInputs = bundle.publicInputs.length !== 6;

  return {
    valid: !emptyProof && !invalidInputs,
    invalidInputs,
    emptyProof,
  };
}
