// =============================================================================
// Proof Screen (FE-07) — VerificationKeyChip
// -----------------------------------------------------------------------------
// Renders the verificationKeyId as a small inline chip/badge. The keyId is
// displayed EXACTLY as received — no truncation, no case conversion, no
// prefix/suffix additions.
//
// Requirements: 6.7
// =============================================================================

import styles from "./VerificationKeyChip.module.scss";

export interface VerificationKeyChipProps {
  /** The verification key identifier from the API response. */
  keyId: string;
}

/**
 * Chip component displaying the verificationKeyId verbatim.
 * Does NOT truncate, transform case, or otherwise modify the value.
 */
export function VerificationKeyChip({
  keyId,
}: VerificationKeyChipProps): React.JSX.Element {
  return (
    <div className={styles.container}>
      <span className={styles.label}>Verification Key</span>
      <span className={styles.chip}>{keyId}</span>
    </div>
  );
}

export default VerificationKeyChip;
