/**
 * Pure helpers for the `Nav` component.
 *
 * This module contains no React or DOM imports — it is a pure module so the
 * mapping logic can be exercised directly by property tests (P1–P5) without
 * spinning up a renderer.
 *
 * The truth-table implemented here is the one defined in
 * `.kiro/specs/fe-01-app-shell/design.md` under "Status mapping logic".
 *
 * @see ../../../.kiro/specs/fe-01-app-shell/design.md
 * @see ../../constants/nav.ts
 * @see ../../lib/interfaces/state.ts
 */

import type { NavTabId } from "@/app/constants/nav";
import type { AppState } from "@/app/lib/interfaces/state";

/**
 * Visual status value rendered by `StatusIndicator` for a single NavItem.
 *
 * Order in the union mirrors the precedence used by `resolveStatus`:
 * `"active"` strictly outranks `"done"` and `"error"` (Req 6.2); when no
 * AppState is available, the default is `"idle"` (Req 6.11).
 */
export type StatusValue = "idle" | "active" | "done" | "error";

/**
 * Returns `true` iff `pathname` should be considered active for a NavItem
 * whose route is `route`.
 *
 * The matching rule (Req 4.9, 4.10):
 * - If `route === "/"`, it is active only on the exact root path.
 * - Otherwise it is active when `pathname` equals `route` or starts with
 *   `route + "/"` (so `/withdraw/claim` activates the `/withdraw` parent).
 */
export function isPathActive(pathname: string, route: string): boolean {
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(route + "/");
}

/**
 * Resolves the `StatusValue` for a single NavItem given the current
 * `AppState` snapshot and whether the NavItem matches the active pathname.
 *
 * Precedence:
 * 1. `isActive === true` → `"active"` (Req 6.2 wins over done/idle/error).
 * 2. `state == null` → `"idle"` (Req 6.11 default during loading).
 * 3. Per-tab mapping based on the tab's status source.
 *
 * The switch is exhaustive over `NavTabId`; the trailing `never` assignment
 * lets TypeScript flag any newly added tab id at compile time.
 */
export function resolveStatus(
  tabId: NavTabId,
  state: AppState | null,
  isActive: boolean,
): StatusValue {
  if (isActive) return "active";
  if (state == null) return "idle";

  switch (tabId) {
    case "deposit":
      if (state.depositStatus === "rejected") return "error"; // Req 6.9
      if (state.depositStatus === "processed") return "done"; // Req 6.3
      return "idle";

    case "withdraw":
    case "withdraw-claim":
      if (state.withdrawStatus === "rejected") return "error"; // Req 6.10
      if (
        state.withdrawStatus === "processed" ||
        state.withdrawStatus === "claimed"
      ) {
        return "done"; // Req 6.4
      }
      return "idle";

    case "batch":
      if (state.batchStatus === "rejected") return "error"; // Req 6.8
      if (state.batchStatus === "submitted" || state.batchStatus === "settled") {
        return "done"; // Req 6.5
      }
      return "idle";

    case "proof":
    case "proof-submit":
      if (state.proofStatus === "rejected") return "error"; // Req 6.7
      if (state.proofStatus === "generated") return "done"; // Req 6.6
      return "idle";

    case "overview":
    case "failure-demo":
      return "idle"; // Req 6.11

    default: {
      // Exhaustiveness check — if a new NavTabId is added without a case
      // above, TypeScript will flag this assignment.
      const _exhaustive: never = tabId;
      return _exhaustive;
    }
  }
}

/**
 * Returns `true` iff a NavItem should render the literal
 * `"Go to Failure Demo"` tooltip given its resolved status and active flag.
 *
 * Per Req 6.7–6.10, the tooltip surfaces only when the *non-active* resolved
 * status is `"error"`. While the user is on the page that owns a rejected
 * status, the indicator is `"active"` (not `"error"`), so no tooltip shows.
 */
export function isErrorTooltipNeeded(
  value: StatusValue,
  isActive: boolean,
): boolean {
  return value === "error" && !isActive;
}
