"use client";

// =============================================================================
// FE-01 App Shell — NavItem
// -----------------------------------------------------------------------------
// Renders a single navigation leaf (icon + label + StatusIndicator). The
// component is intentionally render-only; the parent `Nav` owns all stateful
// concerns (which item is active, what the resolved `StatusValue` should be,
// breakpoint detection, dropdown / mobile overlay open state).
//
// Two render branches:
//
//   1. Disabled placeholder (`definition.disabled === true`) — used by the
//      `failure-demo` tab per OQ-1 of the spec. Renders an `<a>` with
//      `href="#"`, `aria-disabled="true"`, `tabIndex={-1}`, the configured
//      `disabledTooltip` (defaults to `"Coming soon"`), and an inline
//      `onClick` handler that calls `e.preventDefault()` so accidental
//      activation never scrolls to top. The `pointer-events: none` rule on
//      `.disabled` belt-and-braces the same intent.
//
//   2. Live leaf — renders `<Link href={definition.href}>` with
//      `aria-current="page"` when `isActive` is `true` (Req 4.10).
//
// Both branches render the icon, the label, and the `StatusIndicator`, in that
// visual order; the indicator slot is pushed to the trailing edge by the
// `.indicator` class in `Nav.module.scss`.
//
// Tooltip rule (Req 6.7 – 6.10): when `isErrorTooltipNeeded(status, isActive)`
// returns `true` and the tab's `statusSource` is one of the four backend
// status sources, set `title="Go to Failure Demo"` on the rendered anchor.
// For the disabled `failure-demo` placeholder, the `disabledTooltip` (i.e.
// `"Coming soon"`) wins regardless of status.
//
// Label visibility is handled entirely in CSS:
//   - Mobile / `isMobile === true` → `.labelMobile` is always visible.
//   - Tablet (≥768px and <1024px) → `.label` is `sr-only` (Req 7.2).
//   - Desktop (≥1024px) → `.label` is visible (Req 7.1).
//
// Marked `"use client"` because the disabled placeholder uses an inline
// `onClick` handler (`e.preventDefault()`), which requires a client boundary.
// =============================================================================

import Link from "next/link";

import { icons } from "@/app/assets";
import type { NavLeafDefinition } from "@/app/constants/nav";

import styles from "./Nav.module.scss";



export interface NavItemProps {
  definition: NavLeafDefinition;
  isActive: boolean;
  /** When rendered inside the mobile overlay we use vertical layout + always-visible label. */
  isMobile?: boolean;
  /** Called after a successful navigation click (lets parent close dropdown / overlay). */
  onSelect?: () => void;
}

/**
 * Joins truthy class names with a single space. Mirrors the helper used by
 * `StatusIndicator` so call sites read identically.
 */
function cx(...parts: ReadonlyArray<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function NavItem({
  definition,
  isActive,
  isMobile = false,
  onSelect,
}: NavItemProps): React.JSX.Element {
  const Icon = icons[definition.iconKey];



  // -------------------------------------------------------------------------
  // Disabled placeholder (`failure-demo`). The `disabledTooltip` literal
  // ("Coming soon") wins over any error tooltip the parent might compute.
  // -------------------------------------------------------------------------
  if (definition.disabled === true) {
    return (
      <a
        href="#"
        aria-disabled="true"
        tabIndex={-1}
        title={definition.disabledTooltip}
        onClick={(event) => event.preventDefault()}
        className={cx(styles.item, styles.disabled, isActive && styles.active)}
        data-tab-id={definition.id}
      >
        <span className={styles.iconWrap}>
          <Icon aria-hidden="true" />
        </span>
        <span className={styles.label}>{definition.label}</span>
      </a>
    );
  }

  // -------------------------------------------------------------------------
  // Live leaf — wraps the icon + label + indicator in a Next.js `<Link>`.
  // -------------------------------------------------------------------------
  return (
    <Link
      href={definition.href}
      aria-current={isActive ? "page" : undefined}
      onClick={onSelect}
      className={cx(styles.item, isActive && styles.active)}
      data-tab-id={definition.id}
    >
      <span className={styles.iconWrap}>
        <Icon aria-hidden="true" />
      </span>
      <span className={styles.label}>{definition.label}</span>
    </Link>
  );
}

export default NavItem;
