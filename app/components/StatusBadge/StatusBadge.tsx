// =============================================================================
// Overview Screen (FE-03) — StatusBadge
// -----------------------------------------------------------------------------
// A presentation-only badge that displays the current status of a pipeline
// step (Deposit, Withdraw, Proof, Batch). Shared component placed in
// app/components/ because it is reused across multiple pages (FE-03+).
//
// Props:
//   - pipelineName: human-readable name of the pipeline step (e.g. "Deposit")
//   - status: any valid AnyStatus value from @/app/lib/services/status
//
// Rendering:
//   - Text label: statusLabel(status)
//   - Color classes: derived from statusTone(status) → Tailwind utility classes
//   - role="status" for accessibility live region semantics
//   - aria-label="{pipelineName} status: {statusLabel(status)}"
//   - data-tone={statusTone(status)} for test targeting
//
// Tone → Tailwind class mapping:
//   "muted"   → bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300
//   "info"    → bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200
//   "success" → bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200
//   "danger"  → bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200
//
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 9.6, 10.3
// =============================================================================

import {
  type AnyStatus,
  type StatusTone,
  statusLabel,
  statusTone,
} from "@/app/lib/services/status";
import styles from "./StatusBadge.module.scss";

export interface StatusBadgeProps {
  /** Human-readable pipeline name, e.g. "Deposit", "Withdraw", "Proof", "Batch" */
  pipelineName: string;
  /** Any valid pipeline status value */
  status: AnyStatus;
}

/** Maps a StatusTone to the corresponding Tailwind utility class string. */
const TONE_CLASSES: Record<StatusTone, string> = {
  muted:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
  success:
    "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200",
  danger: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200",
  // "warning" is defined in StatusTone but not used by AnyStatus values;
  // provide a fallback so the Record is exhaustive.
  warning: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-200",
};

export function StatusBadge({
  pipelineName,
  status,
}: StatusBadgeProps): React.JSX.Element {
  const tone = statusTone(status);
  const label = statusLabel(status);
  const toneClasses = TONE_CLASSES[tone];

  return (
    <div
      role="status"
      aria-label={`${pipelineName} status: ${label}`}
      data-tone={tone}
      className={`${styles.badge} ${toneClasses}`}
    >
      <span className={styles.name}>{pipelineName}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}

export default StatusBadge;
