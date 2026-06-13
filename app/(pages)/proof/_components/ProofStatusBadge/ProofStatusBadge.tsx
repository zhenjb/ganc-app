// =============================================================================
// Proof Screen (FE-07) — ProofStatusBadge
// -----------------------------------------------------------------------------
// Renders a visual badge indicating the current proof generation status.
// Each status ("idle" | "generating" | "ready") maps to a distinct label and
// CSS class for colour differentiation.
//
// Accessibility:
//   - `role="status"` surfaces live status changes to assistive technology.
//   - `aria-label` communicates the proof status in a human-readable format.
//
// Requirements: 1.1, 1.2, 1.3, 10.1
// =============================================================================

import type { ProofGenerationStatus } from "@/app/(pages)/proof/_types";

import styles from "./ProofStatusBadge.module.scss";

export interface ProofStatusBadgeProps {
  status: ProofGenerationStatus;
}

/** Map each status to a display label. */
const STATUS_LABELS: Record<ProofGenerationStatus, string> = {
  idle: "Idle",
  generating: "Generating",
  ready: "Ready",
};

/** Map each status to the corresponding CSS module class. */
const STATUS_CLASSES: Record<ProofGenerationStatus, string> = {
  idle: styles.idle,
  generating: styles.generating,
  ready: styles.ready,
};

export function ProofStatusBadge({
  status,
}: ProofStatusBadgeProps): React.JSX.Element {
  const label = STATUS_LABELS[status];

  return (
    <span
      className={`${styles.badge} ${STATUS_CLASSES[status]}`}
      role="status"
      aria-label={`Proof status: ${status}`}
    >
      {label}
    </span>
  );
}
