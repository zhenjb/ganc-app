/**
 * Navigation constants for the FE-01 App Shell.
 *
 * The literal `NAV_ITEMS` array is the single source of truth for both the
 * desktop `Nav` component and the mobile overlay (Req 4.1). The order in this
 * array is the rendering order. `iconKey` references must resolve in
 * `app/assets/index.ts`'s `icons` registry (Req 4.4).
 *
 * @see ./../../.kiro/specs/fe-01-app-shell/design.md "Data Models"
 * @see ./../assets/index.ts
 */

export type NavTabId =
  | "overview"
  | "deposit"
  | "withdraw"
  | "withdraw-claim"
  | "batch"
  | "proof"
  | "proof-submit"
  | "failure-demo";

export type NavStatusSource = "deposit" | "withdraw" | "batch" | "proof" | null;

export interface NavLeafDefinition {
  id: NavTabId;
  label: string; // English literal — see Req 18
  href: string;
  iconKey: keyof typeof import("@/app/assets").icons;
  /** Which AppState.*Status drives this leaf's StatusIndicator. */
  statusSource: NavStatusSource;
  /** Disabled placeholder — used only by "failure-demo" in FE-01. */
  disabled?: boolean;
  disabledTooltip?: string;
}

export interface NavParentDefinition {
  id: NavTabId;
  label: string;
  iconKey: keyof typeof import("@/app/assets").icons;
  statusSource: NavStatusSource;
  children: NavLeafDefinition[];
}

export type NavItemDefinition = NavLeafDefinition | NavParentDefinition;

export const NAV_ITEMS: NavItemDefinition[] = [
  { id: "overview", label: "Overview", href: "/overview", iconKey: "overview", statusSource: null },
  { id: "deposit", label: "Deposit", href: "/deposit", iconKey: "deposit", statusSource: "deposit" },
  {
    id: "withdraw",
    label: "Withdraw",
    iconKey: "withdraw",
    statusSource: "withdraw",
    children: [
      { id: "withdraw", label: "Withdraw Request", href: "/withdraw", iconKey: "withdraw", statusSource: "withdraw" },
      { id: "withdraw-claim", label: "Claim", href: "/withdraw/claim", iconKey: "claim", statusSource: "withdraw" },
    ],
  },
  { id: "batch", label: "Batch", href: "/batch", iconKey: "batch", statusSource: "batch" },
  {
    id: "proof",
    label: "Proof",
    iconKey: "proof",
    statusSource: "proof",
    children: [
      { id: "proof", label: "Proof", href: "/proof", iconKey: "proof", statusSource: "proof" },
      { id: "proof-submit", label: "Submit", href: "/proof/submit-proof", iconKey: "submit", statusSource: "proof" },
    ],
  },
  {
    id: "failure-demo",
    label: "Failure Demo",
    href: "#",
    iconKey: "failureDemo",
    statusSource: null,
    disabled: true,
    disabledTooltip: "Coming soon",
  },
];
