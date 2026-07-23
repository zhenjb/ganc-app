"use client";

// =============================================================================
// FE-01 App Shell — Header
// -----------------------------------------------------------------------------
// The sticky top chrome that hosts three regions in order (Req 3.3, 3.6):
//
//   Left   — product logo + literal `"ZKDEX MVP"` (Req 3.4) wrapped in a
//            `<Link href="/overview">` so it doubles as a "home" affordance.
//   Center — `<Nav />` (Req 3.5).
//   Right  — `<ModeBadge />` → `<StateRootBadge />` → `<ThemeToggleButton />`
//            in that order (Req 3.6).
//
// The Header is sticky to the top of the viewport (Req 3.1) and spans the
// full viewport width (Req 3.2). Tailwind utilities own the layout
// (`sticky top-0 z-40 w-full border-b`, flex regions, gaps) and
// `Header.module.scss` owns stateful styles — badge palettes, skeleton
// shimmer, theme toggle focus ring.
//
// Marked `"use client"` because the sub-components consume the
// `AppStateContext` and `ThemeContext` and render an interactive button
// (`ThemeToggleButton`).
//
// Sub-components
// --------------
// `ModeBadge`       — reads `state.mode` and renders the literal `"Mock"` or
//                     `"Local"` (Req 5.1, 5.2). Renders a skeleton while
//                     `loading && !state` (Req 5.5).
// `StateRootBadge`  — reads `state.currentStateRoot`, renders the literal
//                     label `"State root"` plus either `shortenHex(value, 6, 4)`
//                     (Req 5.3) or the literal `"—"` for null/undefined
//                     (Req 5.4). Renders a skeleton while `loading && !state`
//                     (Req 5.5).
// `ThemeToggleButton` — square button with `aria-label="Toggle theme"`
//                       (Req 14.2) that calls `cycleTheme()` to advance
//                       through `system → light → dark → system` (Req 14.3).
//
// Sub-components are co-located here (rather than as their own folders)
// because they are not reused outside the Header per design.md.
// =============================================================================

import Link from "next/link";

import { icons } from "@/app/assets";
import Nav from "@/app/components/Nav/Nav";
import { useAppStateContext } from "@/app/lib/contexts/AppStateContext";
import { useWalletContext } from "@/app/lib/contexts/WalletContext";
import { useTheme } from "@/app/lib/hooks/useTheme";
import type { AppState } from "@/app/lib/interfaces/state";

import styles from "./Header.module.scss";

/** Joins truthy class names — mirrors the helper used by `NavItem`. */
function cx(
  ...parts: ReadonlyArray<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}

// -----------------------------------------------------------------------------
// ModeBadge — reads `state.mode`
// -----------------------------------------------------------------------------

interface ModeBadgeProps {
  state: AppState | null;
  loading: boolean;
}

function ModeBadge({ state, loading }: ModeBadgeProps): React.JSX.Element | null {
  // Skeleton while the very first fetch is in flight (Req 5.5, 11.1).
  if (loading && !state) {
    return (
      <span
        className={styles.skeletonBadge}
        aria-hidden="true"
        data-testid="header-mode-skeleton"
      />
    );
  }
  if (!state) {
    return null;
  }

  // Per Req 5.1 / 5.2 the literal text is exactly "Mock" or "Local".
  const text = state.mode === "mock" ? "Mock" : "Local";
  const variantClass =
    state.mode === "mock" ? styles.badgeMock : styles.badgeReal;

  return (
    <span
      className={cx(styles.badge, variantClass)}
      role="status"
      aria-label={`Mode ${text}`}
      data-testid="header-mode-badge"
    >
      {text}
    </span>
  );
}

// -----------------------------------------------------------------------------
// WalletButton — connect wallet or show connected address
// -----------------------------------------------------------------------------

function WalletButton(): React.JSX.Element {
  const { address, connecting, connect, disconnect } = useWalletContext();

  if (connecting) {
    return (
      <span
        className={cx(styles.badge, styles.badgeWallet)}
        role="status"
        aria-label="Connecting wallet"
      >
        Connecting…
      </span>
    );
  }

  if (address) {
    const short = `${address.slice(0, 10)}…${address.slice(-4)}`;
    return (
      <button
        type="button"
        className={cx(styles.badge, styles.badgeWallet)}
        onClick={disconnect}
        aria-label={`Disconnect wallet ${address}`}
        title={address}
        data-testid="header-wallet-badge"
      >
        <span className={styles.badgeValue}>{short}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cx(styles.badge, styles.badgeConnect)}
      onClick={connect}
      aria-label="Connect wallet"
      data-testid="header-wallet-connect"
    >
      Connect Wallet
    </button>
  );
}

// -----------------------------------------------------------------------------
// ThemeToggleButton — `aria-label="Toggle theme"` cycles via `cycleTheme()`
// -----------------------------------------------------------------------------

function ThemeToggleButton(): React.JSX.Element {
  const { theme, cycleTheme } = useTheme();

  // Simple toggle: light shows sun, dark shows moon.
  const Icon = theme === "dark" ? icons.moon : icons.sun;

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={cycleTheme}
      className={styles.themeToggle}
      data-testid="header-theme-toggle"
      data-theme={theme}
    >
      <span className={styles.themeIcon}>
        <Icon aria-hidden="true" />
      </span>
    </button>
  );
}

// -----------------------------------------------------------------------------
// Inline product logo
// -----------------------------------------------------------------------------
//
// A small square mark used in the header's left region. Kept inline (not in
// `app/assets/icons/`) because it is a brand mark used only here and is not
// referenced by `NAV_ITEMS`. Uses `currentColor` so it inherits the active
// text color in both light and dark themes.

function BrandLogo(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="2" width="20" height="20" rx="4" />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontSize="14"
        fontWeight="bold"
        fill="currentColor"
        stroke="none"
        fontFamily="system-ui, sans-serif"
      >
        G
      </text>
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Header (default export)
// -----------------------------------------------------------------------------

export function Header(): React.JSX.Element {
  const { state, loading } = useAppStateContext();

  return (
    <header
      // Tailwind owns the sticky three-region layout (Req 3.1, 3.2, 3.3).
      // The `border-b` separates the chrome from the page body; the
      // `bg-background` / `text-foreground` pair (provided by Tailwind v4
      // via `@theme`) keeps the header readable in both light and dark
      // palettes.
      className="sticky top-0 z-40 w-full border-b border-black/10 dark:border-white/10 bg-(--background,#ffffff) text-(--foreground,#171717)"
      role="banner"
    >
      <div className="flex h-14 md:h-16 w-full items-center justify-between gap-3 px-4">
        {/* Left region — logo + product name (Req 3.4). */}
        <div className="flex items-center min-w-0">
          <Link
            href="/overview"
            className={styles.brandLink}
            aria-label="GANC — Overview"
          >
            <span className={styles.brandLogo}>
              <BrandLogo />
            </span>
            <span className={styles.brandText}>GANC</span>
          </Link>
        </div>

        {/* Navigation — aligned left after the logo (Req 3.5). */}
        <div className="flex items-center flex-1 min-w-0 overflow-visible ml-[60px]">
          <Nav />
        </div>

        {/* Right region — mode → wallet → theme toggle (Req 3.6). */}
        <div className="flex items-center gap-2">
          <ModeBadge state={state} loading={loading} />
          <WalletButton />
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
}

export default Header;
