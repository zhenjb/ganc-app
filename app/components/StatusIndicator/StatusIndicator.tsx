// =============================================================================
// FE-01 App Shell — StatusIndicator
// -----------------------------------------------------------------------------
// A small, presentation-only circular indicator rendered next to every Nav
// tab. The four discrete values map 1:1 to the per-tab state derived in
// `Nav` from `AppState`:
//
//   - "idle"   — neutral default                        (Req 6.11)
//   - "active" — the NavItem matches the current route  (Req 6.2)
//   - "done"   — the related backend status is complete (Req 6.3 – 6.6)
//   - "error"  — the related backend status is rejected (Req 6.7 – 6.10)
//
// The component is intentionally pure and decoupled from routing or
// `AppState`. It receives a single `value`, an optional `ariaLabel` override,
// and an optional `className` passthrough for callers (Nav skeleton, etc.) to
// decorate. No hooks, no effects — this component renders on the server.
//
// Default `aria-label`s use the literal capitalized form of `value`
// ("Idle", "Active", "Done", "Error") per design.md table; consumers may
// override via `ariaLabel`.
//
// Sizing: 6×6 on mobile, 8×8 from tablet upward — handled in
// `StatusIndicator.module.scss`.
//
// Style rules live in `StatusIndicator.module.scss`. The CSS module classes
// follow a BEM-style naming convention so the variant class is selectable
// via `styles[`indicator--${value}`]`.
// =============================================================================

import styles from "./StatusIndicator.module.scss";

export type StatusValue = "idle" | "active" | "done" | "error";

export interface StatusIndicatorProps {
  value: StatusValue;
  /** Optional aria-label override; defaults to value-derived text. */
  ariaLabel?: string;
  /** Optional className passthrough so callers (Nav skeleton, etc.) can decorate. */
  className?: string;
}

/** Default aria-label per status value: literal capitalized value. */
const DEFAULT_ARIA_LABEL: Record<StatusValue, string> = {
  idle: "Idle",
  active: "Active",
  done: "Done",
  error: "Error",
};

export function StatusIndicator({
  value,
  ariaLabel,
  className,
}: StatusIndicatorProps): React.JSX.Element {
  const label = ariaLabel ?? DEFAULT_ARIA_LABEL[value];

  const classes = [
    styles.indicator,
    styles[`indicator--${value}`],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      role="img"
      aria-label={label}
      className={classes}
      data-status={value}
    >
      {value === "done" ? (
        <span aria-hidden="true" className={styles.glyph}>
          ✓
        </span>
      ) : null}
      {value === "error" ? (
        <span aria-hidden="true" className={styles.glyph}>
          !
        </span>
      ) : null}
    </span>
  );
}

export default StatusIndicator;
