// =============================================================================
// Proof Screen (FE-07) — ProofBytesPanel
// -----------------------------------------------------------------------------
// Displays the proof hex bytes with a shortened preview, a Copy button, and an
// Expand toggle. Shortened display uses `shortenHex` (first 10 + "…" + last 6)
// for strings longer than 18 characters; shorter strings are shown verbatim.
//
// Clipboard copy: async navigator.clipboard.writeText with silent failure on
// error (no visible notification when the copy fails — Req 6.3).
//
// Expand toggle: reveals the full hex string in a scrollable monospace block
// (overflow-x: auto, max-height: 200px).
//
// Accessibility:
//   - Copy button: aria-label="Copy proof to clipboard" (Req 10.3)
//   - Expand toggle: aria-expanded + aria-label="Expand proof bytes" (Req 10.4)
//
// Requirements: 6.1, 6.2, 6.3, 6.4, 10.3, 10.4
// =============================================================================

"use client";

import { useState } from "react";

import type { HexString } from "@/app/lib/interfaces/state";

import { shortenHex } from "../../_lib/format";
import styles from "./ProofBytesPanel.module.scss";

export interface ProofBytesPanelProps {
  proof: HexString;
}

/**
 * ProofBytesPanel — displays proof bytes with copy and expand functionality.
 */
export function ProofBytesPanel({
  proof,
}: ProofBytesPanelProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  // Display shortened hex (or verbatim if ≤ 18 chars)
  const displayHex = shortenHex(proof);

  /** Copy full proof hex to clipboard. Silent fail on error (Req 6.3). */
  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(proof);
    } catch {
      // Silent fail — do not show error to user
    }
  }

  /** Toggle the expanded hex view. */
  function handleToggleExpand(): void {
    setExpanded((prev) => !prev);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <code className={styles.preview}>{displayHex}</code>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.copyButton}
            aria-label="Copy proof to clipboard"
            onClick={handleCopy}
          >
            Copy
          </button>

          <button
            type="button"
            className={styles.expandButton}
            aria-expanded={expanded}
            aria-label="Expand proof bytes"
            onClick={handleToggleExpand}
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className={styles.expandedBlock}>
          <code className={styles.fullHex}>{proof}</code>
        </div>
      )}
    </div>
  );
}
