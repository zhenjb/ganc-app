// =============================================================================
// Proof Screen (FE-07) — ProofProgress
// -----------------------------------------------------------------------------
// Renders an indeterminate progress bar while proof generation is active.
// When `active` is false the component returns null (unmounts from the DOM).
//
// Accessibility:
//   - `role="progressbar"` identifies the element as a progress indicator.
//   - `aria-busy="true"` signals ongoing activity to assistive technology.
//   - `aria-valuetext` provides a human-readable status description.
//
// Requirements: 1.4, 1.5, 10.2
// =============================================================================

import styles from "./ProofProgress.module.scss";

export interface ProofProgressProps {
  active: boolean;
}

export function ProofProgress({
  active,
}: ProofProgressProps): React.JSX.Element | null {
  if (!active) return null;

  return (
    <div
      className={styles.container}
      role="progressbar"
      aria-busy="true"
      aria-valuetext="Đang sinh proof"
    >
      <div className={styles.track}>
        <div className={styles.bar} />
      </div>
    </div>
  );
}
