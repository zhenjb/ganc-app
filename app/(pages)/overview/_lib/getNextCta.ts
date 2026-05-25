import type { AppState } from "@/app/lib/interfaces/state";

export interface CtaResult {
  label: string;
  href: string;
}

/**
 * Pure function — no side effects, no mutations.
 * Evaluates CTA conditions in strict priority order (AC1 → AC6).
 * Returns the first matching result, or null if none match.
 */
export function getNextCta(state: AppState): CtaResult | null {
  const { depositStatus, withdrawStatus, batchStatus, proofStatus } = state;

  // AC1: Deposit not started yet
  if (depositStatus === "idle") {
    return { label: "Start Deposit", href: "/deposit" };
  }

  // AC2: Deposit done, withdraw not started
  if (depositStatus === "processed" && withdrawStatus === "idle") {
    return { label: "Create Withdraw Request", href: "/withdraw" };
  }

  // AC3: Withdraw pending, batch not started
  if (withdrawStatus === "pending" && batchStatus === "idle") {
    return { label: "Build Batch", href: "/batch" };
  }

  // AC4: Batch submitted, proof not started
  if (batchStatus === "submitted" && proofStatus === "idle") {
    return { label: "Generate Proof", href: "/proof" };
  }

  // AC5: Proof ready to submit
  if (proofStatus === "generated") {
    return { label: "Submit Batch Proof", href: "/proof/submit-proof" };
  }

  // AC6: Proof not generated (already handled above) but withdraw is processed — claim available
  // At this point proofStatus is narrowed to "idle" | "pending" | "rejected" (not "generated"),
  // so the !== "generated" guard is redundant and omitted to satisfy strict TypeScript.
  if (withdrawStatus === "processed") {
    return { label: "Claim Withdraw", href: "/withdraw/claim" };
  }

  return null;
}
