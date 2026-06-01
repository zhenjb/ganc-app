// =============================================================================
// Batch Screen (FE-06) — CommitmentsCard
// -----------------------------------------------------------------------------
// Renders the 4 commitment roots (depositsRoot, withdrawalsRoot, nullifiersRoot,
// withdrawOutputsRoot) as 4 separate visual blocks plus the batch hash.
//
// Behavior:
//   - The 4 roots are read dynamically from `commitments.publicInputs` and are
//     ordered by `selectCommitmentRoots` — never hardcoded (Req 7.1, 7.2, 7.5).
//   - Each root carries a distinct English explanation badge sourced from
//     `app/constants` (Req 7.3).
//   - Each present root value is shortened via `shortenHex` (Req 7.7); clicking
//     it opens the shared `HexRevealModal` with the full value, a copy button,
//     and an English copy confirmation (Req 7.9).
//   - `batchHash` is shortened via `shortenHex` (Req 7.4) and exposes the full
//     hex on hover through the `title` attribute (Req 7.8).
//   - A root considered missing by `isMissingRoot` ("" | null | undefined |
//     "0x") is highlighted in red (Req 7.6) AND surfaces an English text/aria
//     indicator so the missing state is not conveyed by color alone (Req 7.10).
//
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10
// =============================================================================

"use client";

import { useState } from "react";

import {
  COMMITMENT_ROOT_EXPLANATIONS,
  type CommitmentRootKey,
} from "@/app/constants/commitments";
import type { BatchCommitments } from "@/app/lib/interfaces/batch";
import { shortenHex } from "@/app/lib/services/format";

import { HexRevealModal } from "@/app/(pages)/batch/_components/HexRevealModal/HexRevealModal";
import { isMissingRoot, selectCommitmentRoots } from "@/app/(pages)/batch/_lib/roots";

import styles from "./CommitmentsCard.module.scss";

export interface CommitmentsCardProps {
  /** The commitments returned by a successful build (Req 7.1, 7.2). */
  commitments: BatchCommitments;
}

/** Copy-confirmation lifetime for the reveal modal, in milliseconds. */
const COPY_CONFIRM_MS = 2000;

export function CommitmentsCard({
  commitments,
}: CommitmentsCardProps): React.JSX.Element {
  // Tracks which root's reveal modal is currently open (null = closed). Holding
  // the key (rather than the value) keeps the modal value read dynamically from
  // `publicInputs` (Req 7.2).
  const [openRootKey, setOpenRootKey] = useState<CommitmentRootKey | null>(null);

  // Read the 4 roots in their locked relative order (Req 7.5). Values come
  // straight from `commitments.publicInputs` — nothing is hardcoded (Req 7.2).
  const roots = selectCommitmentRoots(commitments.publicInputs);

  const batchHash = commitments.batchHash;
  const openRootValue =
    openRootKey !== null ? commitments.publicInputs[openRootKey] : "";
  const openRootLabel =
    openRootKey !== null
      ? COMMITMENT_ROOT_EXPLANATIONS[openRootKey].label
      : "";

  return (
    <section className={styles.container} aria-label="Batch commitments">
      <h3 className={styles.heading}>Commitments</h3>

      {/* The 4 commitment roots, one separate block each (Req 7.1, 7.5). */}
      <ul className={styles.rootList}>
        {roots.map(({ key, value }) => {
          const rootKey = key as CommitmentRootKey;
          const explanation = COMMITMENT_ROOT_EXPLANATIONS[rootKey];
          const missing = isMissingRoot(value);

          return (
            <li
              key={rootKey}
              // Red highlight when the root is missing (Req 7.6). The
              // `data-missing` hook keeps the styling intent explicit.
              className={`${styles.rootBlock} ${missing ? styles.rootBlockMissing : ""}`}
              data-missing={missing ? "true" : "false"}
            >
              <div className={styles.rootHeader}>
                <span className={styles.rootLabel}>{explanation.label}</span>
                {/* Distinct English explanation badge per root (Req 7.3). */}
                <span className={styles.badge}>{explanation.description}</span>
              </div>

              {missing ? (
                // Text/aria indicator that does not rely on color alone
                // (Req 7.10). `role="status"` surfaces it to assistive tech.
                <p className={styles.missingIndicator} role="status">
                  Missing — this root has no value.
                </p>
              ) : (
                // Shortened value (Req 7.7); clicking reveals the full hex
                // with copy + English confirmation (Req 7.9).
                <button
                  type="button"
                  className={styles.rootValue}
                  title={value}
                  aria-label={`Reveal full ${explanation.label}`}
                  onClick={() => setOpenRootKey(rootKey)}
                >
                  {shortenHex(value)}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Batch hash — shortened (Req 7.4) with full hex on hover (Req 7.8). */}
      <div className={styles.batchHashRow}>
        <span className={styles.batchHashLabel}>Batch hash</span>
        <code className={styles.batchHashValue} title={batchHash}>
          {shortenHex(batchHash)}
        </code>
      </div>

      {/* Reveal modal — full hex + copy + English confirmation (Req 7.9). */}
      <HexRevealModal
        open={openRootKey !== null}
        value={openRootValue}
        label={openRootLabel}
        copyConfirmMs={COPY_CONFIRM_MS}
        onClose={() => setOpenRootKey(null)}
      />
    </section>
  );
}

export default CommitmentsCard;
