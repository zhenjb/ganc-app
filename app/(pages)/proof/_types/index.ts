import type {
  ProofBundle,
  ProofGenerateInput,
  ProofGenerateResponse,
} from "@/app/lib/interfaces/proof";
import type { ProofStatus } from "@/app/lib/interfaces/state";

/**
 * Local proof generation status for the useProofGenerate hook.
 * This is distinct from the global ProofStatus in state.ts which represents
 * server-side state ("idle" | "pending" | "generated" | "rejected").
 */
export type ProofGenerationStatus = "idle" | "generating" | "ready";

/**
 * Result of validating a ProofBundle before storing it.
 */
export interface ProofValidation {
  valid: boolean;
  invalidInputs: boolean;
  emptyProof: boolean;
}

/**
 * Return type of createProofTimeout — an AbortSignal and a cleanup function.
 */
export interface ProofTimeoutResult {
  signal: AbortSignal;
  clear: () => void;
}

/**
 * Options accepted by the useProofGenerate hook.
 */
export interface UseProofGenerateOptions {
  refresh: () => Promise<void>;
  onSuccess?: (response: ProofGenerateResponse) => void;
}

/**
 * Public return shape of the useProofGenerate hook.
 */
export interface UseProofGenerateResult {
  proofStatus: ProofGenerationStatus;
  proofBundle: ProofBundle | null;
  error: boolean;
  timedOut: boolean;
  invalidInputs: boolean;
  generate: (input: ProofGenerateInput) => Promise<void>;
  clearError: () => void;
}
