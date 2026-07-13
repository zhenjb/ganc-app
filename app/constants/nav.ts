/**
 * Navigation constants for the FE-01 App Shell.
 *
 * The literal `NAV_ITEMS` array is the single source of truth for both the
 * desktop `Nav` component and the mobile overlay (Req 4.1). The order in this
 * array is the rendering order. `iconKey` references must resolve in
 * `app/assets/index.ts`'s `icons` registry (Req 4.4).
 *
 * @see ./../../.kiro/specs/fe-01-app-shell/design.md "Data Models"
 * @see ../assets/index.ts
 */

export type NavTabId =
  | "overview"
  | "deposit"
  | "trade";

export type NavStatusSource = "deposit" | null;

export interface NavLeafDefinition {
  id: NavTabId;
  label: string; // English literal — see Req 18
  href: string;
  iconKey: keyof typeof import("@/app/assets").icons;
  /** Which AppState.*Status drives this leaf's StatusIndicator. */
  statusSource: NavStatusSource;
  /** Disabled placeholder — reserved for future work. */
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
  { id: "deposit", label: "Wallet", href: "/wallet", iconKey: "wallet", statusSource: "deposit" },
  { id: "trade", label: "Trade", href: "/trade", iconKey: "trade", statusSource: null },
];
