"use client";

// =============================================================================
// FE-01 App Shell — MobileNavOverlay
// -----------------------------------------------------------------------------
// Full-width vertical overlay shown at Breakpoint_Mobile (Req 7.4, 7.5, 7.6).
// Lists every NavItem and dropdown sub-item in the order defined by
// `NAV_ITEMS`. Per design.md, dropdown parents are rendered as section
// headings with their children indented below — there is no collapse on
// mobile so every destination remains one tap away.
//
// Behavior:
//   - When `isOpen === false` the component returns `null` so it neither
//     traps focus nor consumes layout space.
//   - When open, renders a fixed full-screen `<div role="dialog"
//     aria-modal="true">` with a top bar containing a close button (Req 7.4)
//     and a scrollable body listing every item (Req 7.5).
//   - Selecting any leaf calls `onSelect={onClose}` on the underlying
//     `NavItem`, so navigation also closes the overlay (Req 7.6). The Next.js
//     `<Link>` inside `NavItem` performs the actual navigation.
//   - Pressing Escape while open closes the overlay (good-UX parity with the
//     dropdown; powered by the shared `useEscapeKey` hook).
//
// Body scroll-lock is intentionally NOT handled here — per design notes the
// parent `Nav` component owns that side-effect so the overlay component
// stays render-only and easy to test.
//
// Marked `"use client"` because it consumes the `useEscapeKey` hook.
// =============================================================================

import NavItem from "@/app/components/Nav/NavItem";
import type {
  NavItemDefinition,
  NavLeafDefinition,
  NavParentDefinition,
  NavTabId,
} from "@/app/constants/nav";
import { useEscapeKey } from "@/app/lib/hooks/useEscapeKey";

import styles from "./Nav.module.scss";

export interface MobileNavOverlayProps {
  /** Top-level NavItem definitions (parents and leaves). */
  items: ReadonlyArray<NavItemDefinition>;
  /** Currently active NavTabId, or null. Used to highlight the matching row. */
  activeTabId: NavTabId | null;
  /** Whether the overlay is currently visible. */
  isOpen: boolean;
  /** Closes the overlay. */
  onClose: () => void;
}

/**
 * Type guard — discriminates `NavParentDefinition` from `NavLeafDefinition`
 * by the presence of a `children` array. Kept local because no other module
 * needs it today; can be lifted into `app/constants/nav.ts` later if it does.
 */
function isParentDefinition(
  def: NavItemDefinition,
): def is NavParentDefinition {
  return "children" in def;
}

export function MobileNavOverlay({
  items,
  activeTabId,
  isOpen,
  onClose,
}: MobileNavOverlayProps): React.JSX.Element | null {
  // Always call hooks unconditionally; the `enabled` flag short-circuits the
  // listener subscription when the overlay is closed.
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
    >
      <div className={styles.overlayTop}>
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className={styles.closeButton}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div className={styles.overlayBody}>
        <ul className={styles.mobileList}>
          {items.map((def) => {
            if (isParentDefinition(def)) {
              return (
                <li key={def.id} className={styles.mobileGroup}>
                  <div className={styles.mobileSection}>{def.label}</div>
                  <ul className={styles.mobileChildren}>
                    {def.children.map((child: NavLeafDefinition) => (
                      <li key={child.id}>
                        <NavItem
                          definition={child}
                          isActive={activeTabId === child.id}
                          isMobile={true}
                          onSelect={onClose}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              );
            }

            const leaf = def;
            return (
              <li key={leaf.id}>
                <NavItem
                  definition={leaf}
                  isActive={activeTabId === leaf.id}
                  isMobile={true}
                  onSelect={onClose}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default MobileNavOverlay;
