"use client";

// =============================================================================
// FE-01 App Shell — Nav root component
// -----------------------------------------------------------------------------
// Owns the responsive switch between the inline desktop/tablet `<ul>` of
// `NavItem` / `NavDropdown` and the mobile `MobileNavOverlay`, plus the open
// state of the dropdowns and the mobile overlay. All status mapping and
// active-route detection is delegated to the pure helpers in
// `./resolveStatus.ts`.
//
// Concerns owned here:
//   - `openDropdownId: NavTabId | null` — only one dropdown open at a time
//     (Req 4.6, 4.7, 4.8).
//   - `mobileOpen: boolean` — whether the mobile overlay is showing
//     (Req 7.4, 7.5, 7.6).
//   - Active matching from `usePathname()` via `isPathActive` (Req 4.9, 4.10).
//   - Per-tab `StatusValue` resolution via `resolveStatus` using
//     `useAppStateContext().state` (Req 6.1 – 6.11).
//   - SSR-safe breakpoint detection via `useMediaQuery(MEDIA_TABLET_AND_UP)`
//     (Req 7.1, 7.2, 7.4).
//   - Closing any open dropdown / overlay when the pathname changes (so a
//     navigation triggered from a popover or overlay cleans itself up — also
//     covers Req 7.6) and when the breakpoint switches.
//
// What is intentionally NOT here:
//   - Body scroll-lock (kept out of FE-01 per design notes).
//   - Tooltip rendering — that lives in `NavItem` / `NavDropdown`.
//   - Active-state CSS — `NavItem` / `NavDropdown` apply `.active` themselves.
//
// Pathname-stability rule (Req 7.7): we only mutate `openDropdownId` and
// `mobileOpen` on breakpoint transitions; we never call `router.push` or
// otherwise navigate from this component, so `usePathname()` stays stable
// across viewport-width changes.
// =============================================================================

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { icons } from "@/app/assets";
import MobileNavOverlay from "@/app/components/Nav/MobileNavOverlay";
import NavDropdown from "@/app/components/Nav/NavDropdown";
import NavItem from "@/app/components/Nav/NavItem";
import {
  isPathActive,
  resolveStatus,
  type StatusValue,
} from "@/app/components/Nav/resolveStatus";
import {
  NAV_ITEMS,
  type NavItemDefinition,
  type NavParentDefinition,
  type NavTabId,
} from "@/app/constants/nav";
import { MEDIA_TABLET_AND_UP } from "@/app/constants/breakpoints";
import { useAppStateContext } from "@/app/lib/contexts/AppStateContext";
import { useMediaQuery } from "@/app/lib/hooks/useMediaQuery";

import styles from "./Nav.module.scss";

export interface NavProps {
  /** Optional override for tests; production reads from `NAV_ITEMS`. */
  items?: NavItemDefinition[];
}

/**
 * Type guard discriminating `NavParentDefinition` from `NavLeafDefinition`
 * by the presence of a `children` array. Kept local — it is the same guard
 * used inside `MobileNavOverlay`, but no other module needs to share it.
 */
function isParentDefinition(
  def: NavItemDefinition,
): def is NavParentDefinition {
  return "children" in def;
}

interface ActiveMatch {
  /** The most-specific leaf/child id matching the current pathname (or null). */
  activeTabId: NavTabId | null;
  /** Non-null only when the active route lives under a dropdown parent. */
  activeChildId: NavTabId | null;
}

/**
 * Compute which leaf/child is active for the given `pathname`. The disabled
 * `failure-demo` placeholder is implicitly excluded because its `href` is
 * `"#"` and `isPathActive(p, "#")` is always `false`; we keep the explicit
 * `disabled` skip below for clarity.
 *
 * Specificity rule: when multiple items match (e.g. the dropdown has both
 * `/proof` and `/proof/submit-proof` as children, and the user is on
 * `/proof/submit-proof`), we pick the *longest* matching `href` so the more
 * specific child wins. Without this, prefix matching causes the parent route
 * (`/proof`) to highlight even when a sub-route is active.
 */
function computeActiveMatch(
  items: ReadonlyArray<NavItemDefinition>,
  pathname: string,
): ActiveMatch {
  let best: { match: ActiveMatch; hrefLength: number } = {
    match: { activeTabId: null, activeChildId: null },
    hrefLength: -1,
  };

  const consider = (
    href: string,
    candidate: ActiveMatch,
  ): void => {
    if (!isPathActive(pathname, href)) return;
    if (href.length > best.hrefLength) {
      best = { match: candidate, hrefLength: href.length };
    }
  };

  for (const def of items) {
    if (isParentDefinition(def)) {
      for (const child of def.children) {
        consider(child.href, {
          activeTabId: child.id,
          activeChildId: child.id,
        });
      }
    } else {
      if (def.disabled === true) continue;
      consider(def.href, { activeTabId: def.id, activeChildId: null });
    }
  }

  return best.match;
}

export function Nav({ items: itemsProp }: NavProps = {}): React.JSX.Element {
  const items = itemsProp ?? NAV_ITEMS;

  const pathname = usePathname() ?? "/";
  const { state } = useAppStateContext();
  const isTabletOrUp = useMediaQuery(MEDIA_TABLET_AND_UP);

  const [openDropdownId, setOpenDropdownId] = useState<NavTabId | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Reset open dropdown / overlay when the pathname changes (e.g. after the
  // user clicks a child in a popover or a row in the mobile overlay). This
  // also implements the Req 7.6 close-on-selection contract for the mobile
  // overlay because Next.js commits the new pathname before the overlay's
  // `onSelect` resolves. We also reset on breakpoint switch so a stale-open
  // popover/overlay does not survive a viewport-width transition (the two
  // affordances live in different render branches).
  //
  // We use the React 19 "store the last seen prop in state" pattern instead
  // of a `useEffect` with `setState` — that pattern is flagged by the
  // `react-hooks/set-state-in-effect` rule because it triggers a cascading
  // render. The branch below runs at most once per (pathname, isTabletOrUp)
  // change and short-circuits on every other render.
  const [lastSync, setLastSync] = useState<{
    pathname: string;
    isTabletOrUp: boolean;
  }>({ pathname, isTabletOrUp });
  if (
    lastSync.pathname !== pathname ||
    lastSync.isTabletOrUp !== isTabletOrUp
  ) {
    setLastSync({ pathname, isTabletOrUp });
    if (openDropdownId !== null) setOpenDropdownId(null);
    if (mobileOpen) setMobileOpen(false);
  }

  // ---------------------------------------------------------------------------
  // Memoize active-route match and per-tab resolved statuses. Both are pure
  // computations over (items, pathname, state) and are O(items + children),
  // so memoizing avoids redoing the work on every dropdown / overlay toggle.
  // ---------------------------------------------------------------------------
  const { activeTabId, activeChildId } = useMemo(
    () => computeActiveMatch(items, pathname),
    [items, pathname],
  );

  const statuses = useMemo<Record<NavTabId, StatusValue>>(() => {
    const map = {} as Record<NavTabId, StatusValue>;
    for (const def of items) {
      if (isParentDefinition(def)) {
        const isParentActive = def.children.some((c) => c.id === activeChildId);
        map[def.id] = resolveStatus(def.id, state, isParentActive);
        for (const child of def.children) {
          map[child.id] = resolveStatus(
            child.id,
            state,
            activeChildId === child.id,
          );
        }
      } else {
        map[def.id] = resolveStatus(def.id, state, activeTabId === def.id);
      }
    }
    return map;
  }, [items, state, activeTabId, activeChildId]);

  // ---------------------------------------------------------------------------
  // Mobile branch: hamburger button + overlay. The overlay renders nothing
  // when `mobileOpen` is false, so the DOM stays clean.
  // ---------------------------------------------------------------------------
  if (!isTabletOrUp) {
    // const HamburgerIcon = icons.hamburger;
    return (
      <nav className={styles.navRoot} aria-label="Primary">
        {/* <button
          type="button"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
          className={styles.hamburger}
        >
          <HamburgerIcon />
        </button>
        <MobileNavOverlay
          items={items}
          statuses={statuses}
          activeTabId={activeTabId}
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        /> */}
      </nav>
    );
  }

  // ---------------------------------------------------------------------------
  // Desktop / tablet branch: inline `<ul role="menubar">` of leaves and
  // dropdown parents.
  // ---------------------------------------------------------------------------
  return (
    <nav className={styles.navRoot} aria-label="Primary">
      <ul role="menubar" className={styles.navList}>
        {items.map((def) => {
          if (isParentDefinition(def)) {
            const isParentActive = def.children.some(
              (c) => c.id === activeChildId,
            );
            // Per-child status map for this parent — narrowed to the children
            // for clarity; `statuses` already contains the same values but
            // typed `Record<NavTabId, StatusValue>`.
            const childStatuses = statuses;
            return (
              <li key={def.id} role="none">
                <NavDropdown
                  definition={def}
                  parentStatus={statuses[def.id] ?? "idle"}
                  isParentActive={isParentActive}
                  activeChildId={activeChildId}
                  childStatuses={childStatuses}
                  isOpen={openDropdownId === def.id}
                  onToggle={() =>
                    setOpenDropdownId((prev) =>
                      prev === def.id ? null : def.id,
                    )
                  }
                  onClose={() => setOpenDropdownId(null)}
                />
              </li>
            );
          }

          const leaf = def;
          return (
            <li key={leaf.id} role="none">
              <NavItem
                definition={leaf}
                status={statuses[leaf.id] ?? "idle"}
                isActive={activeTabId === leaf.id}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default Nav;
