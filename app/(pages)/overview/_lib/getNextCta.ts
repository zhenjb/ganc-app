import type { AppState } from "@/app/lib/interfaces/state";

export interface CtaResult {
  label: string;
  href: string;
}

/**
 * Pure function — no side effects, no mutations.
 * Evaluates CTA conditions in strict priority order.
 * Returns the first matching result, or null if none match.
 */
export function getNextCta(state: AppState): CtaResult | null {
  const { depositStatus, withdrawStatus } = state;

  // 1. Deposit not started yet
  if (depositStatus === "none") {
    return { label: "Start Deposit", href: "/wallet" };
  }

  // 2. Deposit done, withdraw not started
  if (depositStatus === "processed" && withdrawStatus === "none") {
    return { label: "Create Withdraw Request", href: "/wallet" };
  }

  // 3. Withdraw processed — claim available
  if (withdrawStatus === "processed") {
    return { label: "Claim Withdraw", href: "/wallet" };
  }

  return null;
}
