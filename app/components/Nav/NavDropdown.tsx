"use client";

// =============================================================================
// FE-01 App Shell — NavDropdown
// -----------------------------------------------------------------------------
// Renders a navigation parent (e.g. `Withdraw`, `Proof`) whose `children` are
// rendered through `NavItem`. The component is purely render-only with respect
// to navigation state — the parent `Nav` owns `openDropdownId`, the resolved
// `StatusValue` for the parent and each child, the active child id, and the
// `isMobile` switch.
//
// Two render branches:
//
//   1. Desktop / Tablet (`isMobile === false`):
//      - A wrapping `<div>` keyed by `containerRef` so `useOnClickOutside`
//        can detect pointer-down events outside the popover (Req 4.7).
//      - A trigger `<button>` (icon + label + chevron + StatusIndicator) that
//        toggles the popover via `onToggle` (Req 4.6). When `isParentActive`
//        is true the trigger receives `styles.active` (Req 4.10) and an
//        `aria-current="page"`.
//      - A popover `<ul role="menu">` rendered only when `isOpen`. Each child
//        is a `<li role="none">` containing a `NavItem`; clicking a child
//        calls `onClose` so the popover collapses (Req 4.6 closure rule).
//      - `useEscapeKey` is wired to `onClose` and gated by `isOpen` so it
//        only fires while the popover is open (Req 4.8).
//
//   2. Mobile (`isMobile === true`):
//      - Per design.md ("Mobile: dropdowns are not collapsible — the overlay
//        shows a flat list grouping with the parent's label rendered as a
//        section heading"), we render a static section heading and an
//        indented `<ul>` of child `NavItem`s. `isOpen`/`onToggle` are not used.
//
// Tooltip rule (Req 6.7 – 6.10): on the desktop/tablet trigger, when
// `isErrorTooltipNeeded(parentStatus, isParentActive)` is true AND the parent
// has a real `statusSource` (i.e. `withdraw` or `proof`), set
// `title="Go to Failure Demo"` so the trailing-edge indicator surfaces the
// link to the failure-demo flow.
//
// Marked `"use client"` because the component owns refs, click handlers, and
// hooks (`useOnClickOutside`, `useEscapeKey`).
// =============================================================================

import { useRef } from "react";

import { icons } from "@/app/assets";
import NavItem from "@/app/components/Nav/NavItem";
import {
  isErrorTooltipNeeded,
  type StatusValue,
} from "@/app/components/Nav/resolveStatus";
import StatusIndicator from "@/app/components/StatusIndicator/StatusIndicator";
import type { NavParentDefinition, NavTabId } from "@/app/constants/nav";
import { useEscapeKey } from "@/app/lib/hooks/useEscapeKey";
import { useOnClickOutside } from "@/app/lib/hooks/useOnClickOutside";

import styles from "./Nav.module.scss";

/** Literal tooltip text for an errored parent (Req 6.7–6.10). */
const ERROR_TOOLTIP = "Go to Failure Demo";

export interface NavDropdownProps {
  definition: NavParentDefinition;
  /** Resolved status for the parent (computed from any child's statusSource by Nav). */
  parentStatus: StatusValue;
  /** Whether the parent is itself active (i.e. one of its children matches the pathname). */
  isParentActive: boolean;
  /** Active child id, propagated so the highlighted row in the popover matches the route. */
  activeChildId: NavTabId | null;
  /** Per-child resolved status, keyed by child id. */
  childStatuses: Record<NavTabId, StatusValue>;
  /** Open / close state (controlled by parent Nav). */
  isOpen: boolean;
  /** Parent toggles the dropdown id; this fires when the trigger is clicked. */
  onToggle: () => void;
  /** Parent closes the dropdown (used by click-outside, Escape, child selection). */
  onClose: () => void;
  /** Whether we are rendering inside the mobile overlay; if true, render flat (no popover). */
  isMobile?: boolean;
}

/**
 * Joins truthy class names with a single space. Mirrors the helper used by
 * `NavItem` and `StatusIndicator` so call sites read identically.
 */
function cx(...parts: ReadonlyArray<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function NavDropdown({
  definition,
  parentStatus,
  isParentActive,
  activeChildId,
  childStatuses,
  isOpen,
  onToggle,
  onClose,
  isMobile = false,
}: NavDropdownProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const ParentIcon = icons[definition.iconKey];
  const ChevronIcon = icons.chevron;

  // Close handlers — only relevant on desktop/tablet. On mobile we render a
  // flat group, so no popover and no close affordance is needed.
  useOnClickOutside(containerRef, () => {
    if (!isMobile && isOpen) onClose();
  });
  useEscapeKey(() => {
    if (!isMobile) onClose();
  }, !isMobile && isOpen);

  // ---------------------------------------------------------------------------
  // Mobile: flat group with section heading + indented children.
  // ---------------------------------------------------------------------------
  if (isMobile) {
    return (
      <div className={styles.dropdownMobileGroup} data-tab-id={definition.id}>
        <div className={styles.dropdownMobileHeading}>
          <span className={styles.iconWrap}>
            <ParentIcon aria-hidden="true" />
          </span>
          <span className={styles.labelMobile}>{definition.label}</span>
          <StatusIndicator
            value={parentStatus}
            className={styles.indicator}
          />
        </div>
        <ul className={styles.dropdownMobileList} role="list">
          {definition.children.map((child) => (
            <li key={child.id}>
              <NavItem
                definition={child}
                status={childStatuses[child.id] ?? "idle"}
                isActive={activeChildId === child.id}
                isMobile
                onSelect={onClose}
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Desktop / Tablet: trigger button + popover list.
  // ---------------------------------------------------------------------------
  const showErrorTooltip =
    isErrorTooltipNeeded(parentStatus, isParentActive) &&
    definition.statusSource !== null;

  return (
    <div ref={containerRef} className={styles.dropdown} data-tab-id={definition.id}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-current={isParentActive ? "page" : undefined}
        title={showErrorTooltip ? ERROR_TOOLTIP : undefined}
        onClick={onToggle}
        className={cx(
          styles.item,
          styles.dropdownTrigger,
          isParentActive && styles.active,
        )}
        data-tab-id={definition.id}
      >
        <span className={styles.iconWrap}>
          <ParentIcon aria-hidden="true" />
        </span>
        <span className={styles.label}>{definition.label}</span>
        <span
          aria-hidden="true"
          className={cx(
            styles.dropdownChevron,
            isOpen && styles.dropdownChevronOpen,
          )}
        >
          <ChevronIcon />
        </span>
        <StatusIndicator value={parentStatus} className={styles.indicator} />
      </button>

      {isOpen ? (
        <ul role="menu" className={styles.dropdownPopover}>
          {definition.children.map((child) => (
            <li key={child.id} role="none">
              <NavItem
                definition={child}
                status={childStatuses[child.id] ?? "idle"}
                isActive={activeChildId === child.id}
                onSelect={onClose}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default NavDropdown;
