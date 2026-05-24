"use client";

// =============================================================================
// AnnouncementBanner — full-width inline banner used by the App Shell.
// -----------------------------------------------------------------------------
// Variants:
//   - "info"    — neutral system messages
//   - "warning" — mock-mode banner (Req 9)
//   - "error"   — NormalizedError banner (Req 10, Req 13)
//
// Placement (full-width, directly below the Header per Req 8.7) is the
// responsibility of `AppShell`; this component only owns its own DOM box and
// dismissal state.
//
// Requirements covered: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 17.3.
// =============================================================================

import { useState, type ReactNode } from "react";
import styles from "./AnnouncementBanner.module.scss";

export type AnnouncementBannerVariant = "info" | "warning" | "error";
export type AnnouncementBannerRole = "status" | "alert";

export interface AnnouncementBannerProps {
  /** Visual + semantic variant. (Req 8.1) */
  variant: AnnouncementBannerVariant;
  /** Body text rendered verbatim. (Req 8.2) */
  message: string;
  /** Optional left-side slot, rendered before the message. (Req 8.3) */
  icon?: ReactNode;
  /** Optional right-side slot, rendered after the message. (Req 8.3) */
  action?: ReactNode;
  /** Whether the banner exposes a close button. Defaults to `false`. (Req 8.4) */
  dismissible?: boolean;
  /** Invoked when the user clicks the close button. (Req 8.6) */
  onDismiss?: () => void;
  /**
   * ARIA live-region role. Defaults to `"alert"` for `variant="error"` and
   * `"status"` for the other variants.
   */
  role?: AnnouncementBannerRole;
  /** Optional extra class for placement consumers (e.g. AppShell). */
  className?: string;
}

function defaultRoleFor(variant: AnnouncementBannerVariant): AnnouncementBannerRole {
  return variant === "error" ? "alert" : "status";
}

export function AnnouncementBanner({
  variant,
  message,
  icon,
  action,
  dismissible = false,
  onDismiss,
  role,
  className,
}: AnnouncementBannerProps): React.ReactElement | null {
  const [dismissed, setDismissed] = useState(false);

  // Req 8.6 — clicking close hides the DOM node entirely.
  if (dismissed) {
    return null;
  }

  const resolvedRole: AnnouncementBannerRole = role ?? defaultRoleFor(variant);

  const handleDismiss = (): void => {
    onDismiss?.();
    setDismissed(true);
  };

  const classes = [
    styles.banner,
    styles[`banner--${variant}`],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div role={resolvedRole} data-variant={variant} className={classes}>
      {icon != null ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}

      <p className={styles.message}>{message}</p>

      {action != null ? <span className={styles.action}>{action}</span> : null}

      {dismissible ? (
        <button
          type="button"
          aria-label="Dismiss"
          className={styles.dismissButton}
          onClick={handleDismiss}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );
}

export default AnnouncementBanner;
