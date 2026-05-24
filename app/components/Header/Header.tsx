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
//                     `"Real"` (Req 5.1, 5.2). Renders a skeleton while
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
import { useTheme } from "@/app/lib/hooks/useTheme";
import { shortenHex } from "@/app/lib/services/format";
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

  // Per Req 5.1 / 5.2 the literal text is exactly "Mock" or "Real".
  const text = state.mode === "mock" ? "Mock" : "Real";
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
// StateRootBadge — reads `state.currentStateRoot`
// -----------------------------------------------------------------------------

interface StateRootBadgeProps {
  state: AppState | null;
  loading: boolean;
}

/** Literal placeholder rendered when `currentStateRoot` is null/undefined (Req 5.4). */
const STATE_ROOT_PLACEHOLDER = "—";

function StateRootBadge({
  state,
  loading,
}: StateRootBadgeProps): React.JSX.Element | null {
  // Skeleton while the very first fetch is in flight (Req 5.5, 11.1).
  if (loading && !state) {
    return (
      <span
        className={styles.skeletonBadge}
        aria-hidden="true"
        data-testid="header-stateroot-skeleton"
      />
    );
  }
  if (!state) {
    return null;
  }

  const value = state.currentStateRoot;
  // `shortenHex(value, 6, 4)` produces the "0xABCDEF…1234" form mandated by
  // Req 5.3 (6 hex chars after `0x`, separator `…`, 4 trailing hex chars).
  // For null / undefined we surface the literal placeholder while keeping
  // the "State root" label visible (Req 5.4).
  const display =
    value == null || value === ""
      ? STATE_ROOT_PLACEHOLDER
      : shortenHex(value, 6, 4);

  return (
    <span
      className={styles.badge}
      role="status"
      data-testid="header-stateroot-badge"
    >
      <span className={styles.badgeLabel}>State root</span>
      <span className={styles.badgeValue}>{display}</span>
    </span>
  );
}

// -----------------------------------------------------------------------------
// ThemeToggleButton — `aria-label="Toggle theme"` cycles via `cycleTheme()`
// -----------------------------------------------------------------------------

function ThemeToggleButton(): React.JSX.Element {
  const { theme, resolvedTheme, cycleTheme } = useTheme();

  // Pick the icon based on the user's explicit choice. While `theme` is
  // `"system"` we surface the system icon so the button reflects the
  // chosen mode rather than the resolved palette; for explicit `"light"`
  // and `"dark"` we use the matching sun/moon glyph.
  const Icon =
    theme === "system"
      ? icons.system
      : resolvedTheme === "dark"
        ? icons.moon
        : icons.sun;

  return (
    <button
      type="button"
      // Exact literal mandated by Req 14.2 — must not be translated or
      // augmented. Tests assert `aria-label="Toggle theme"` verbatim.
      aria-label="Toggle theme"
      onClick={cycleTheme}
      className={styles.themeToggle}
      data-testid="header-theme-toggle"
      data-theme={theme}
      data-resolved-theme={resolvedTheme}
    >
      <span className={styles.themeIcon}>
        <Icon aria-hidden="true" />
      </span>
      {/* sr-only text helps screen readers announce the current mode while
          the button's primary label stays the literal "Toggle theme". */}
      <span className={styles.themeBadge}>{theme}</span>
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
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 8h8" />
      <path d="m8 16 8-8" />
      <path d="M8 16h8" />
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
            aria-label="ZKDEX MVP — Overview"
          >
            <span className={styles.brandLogo}>
              <BrandLogo />
            </span>
            <span className={styles.brandText}>ZKDEX MVP</span>
          </Link>
        </div>

        {/* Center region — primary navigation (Req 3.5). */}
        <div className="flex items-center justify-center flex-1 min-w-0">
          <Nav />
        </div>

        {/* Right region — mode → state-root → theme toggle (Req 3.6). */}
        <div className="flex items-center gap-2">
          <ModeBadge state={state} loading={loading} />
          <StateRootBadge state={state} loading={loading} />
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
}

export default Header;
