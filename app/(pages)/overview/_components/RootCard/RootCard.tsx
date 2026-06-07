// =============================================================================
// Overview Screen (FE-03) — RootCard
// -----------------------------------------------------------------------------
// Displays the current ZK state root with a shortened hex label, a mode badge,
// and a Copy-to-clipboard button with toast confirmation.
//
// Props:
//   - currentStateRoot: HexString | null — the raw hex string to display/copy
//   - mode: Mode — "mock" | "local", controls the badge label
//
// Copy behaviour:
//   - Clipboard API available: writes full hex, shows toast for 1500ms
//   - Clipboard API unavailable: selects the text node, shows hint for 3000ms
//   - currentStateRoot is null: button has aria-disabled="true", click is no-op
//
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 10.2, 10.4
// =============================================================================

"use client";

import { useRef, useState } from "react";
import type { HexString, Mode } from "@/app/lib/interfaces/state";
import { shortenHex } from "@/app/lib/services/format";
import { Toast } from "@/app/components/Toast/Toast";
import styles from "./RootCard.module.scss";

export interface RootCardProps {
  /** The full hex state root to display and copy, or null when unavailable. */
  currentStateRoot: HexString | null;
  /** Operating mode — controls the badge label. */
  mode: Mode;
}

/**
 * RootCard — shows the current ZK state root with copy-to-clipboard support.
 */
export function RootCard({
  currentStateRoot,
  mode,
}: RootCardProps): React.JSX.Element {
  const [toastVisible, setToastVisible] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // Ref to the hex label span so we can select its text as a fallback.
  const hexLabelRef = useRef<HTMLSpanElement>(null);

  const displayLabel =
    currentStateRoot !== null
      ? shortenHex(currentStateRoot, 6, 4)
      : "—";

  const isDisabled = currentStateRoot === null;

  function handleCopy() {
    // Guard: do nothing when root is null (aria-disabled pattern).
    if (isDisabled) return;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      // Modern Clipboard API path.
      navigator.clipboard
        .writeText(currentStateRoot)
        .then(() => {
          setToastVisible(true);
          setTimeout(() => setToastVisible(false), 1500);
        })
        .catch(() => {
          // Clipboard write failed — fall through to selection fallback.
          selectFallback();
        });
    } else {
      // Clipboard API unavailable — select the text node as fallback.
      selectFallback();
    }
  }

  function selectFallback() {
    if (hexLabelRef.current) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(hexLabelRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    setHint("Press Ctrl+C to copy");
    setTimeout(() => setHint(null), 3000);
  }

  return (
    <section className={styles.card} aria-label="Current state root">
      {/* Card header row: title + mode badge */}
      <div className={styles.header}>
        <h2 className={styles.title}>State Root</h2>
        <span
          className={`${styles.modeBadge} ${
            mode === "mock" ? styles["modeBadge--mock"] : styles["modeBadge--real"]
          }`}
        >
          {mode === "mock" ? "Mock" : "Local"}
        </span>
      </div>

      {/* Hex label row */}
      <div className={styles.hexRow}>
        <span
          ref={hexLabelRef}
          className={styles.hexLabel}
          title={currentStateRoot ?? undefined}
        >
          {displayLabel}
        </span>

        {/* Copy button */}
        <button
          type="button"
          className={styles.copyButton}
          aria-label="Copy state root to clipboard"
          aria-disabled={isDisabled ? "true" : undefined}
          onClick={handleCopy}
        >
          {/* Clipboard icon — inline SVG, decorative */}
          <svg
            aria-hidden="true"
            focusable="false"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="5"
              y="5"
              width="9"
              height="10"
              rx="1"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M3 11H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className={styles.copyLabel}>Copy</span>
        </button>
      </div>

      {/* Clipboard fallback hint */}
      {hint !== null && (
        <p className={styles.hint} role="status" aria-live="polite">
          {hint}
        </p>
      )}

      {/* Copy confirmation toast */}
      <Toast message="Copied!" visible={toastVisible} durationMs={1500} />
    </section>
  );
}

export default RootCard;
