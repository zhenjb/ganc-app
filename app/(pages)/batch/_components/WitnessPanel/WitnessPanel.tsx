// =============================================================================
// FE-06 Batch Screen — WitnessPanel
// -----------------------------------------------------------------------------
// A collapsible panel that visualizes the build `witness`. It lists
// `witness.inputs[]` (each shortened via `shortenWitnessInput`) with a per-input
// copy button that writes the FULL un-shortened hex to the clipboard, and renders
// `witness.auxiliary` as a key/value table when at least one entry exists.
//
// A "Show secret (dev only)" toggle (default OFF) masks any auxiliary entry whose
// key contains "secret" (case-insensitive) to a fixed "********" via
// `maskAuxValue`; turning it on reveals the real values and surfaces a dev-only
// warning, turning it off re-masks them.
//
// When the witness is missing or missing fields, the panel still renders the
// parts that are available and shows an inline "Witness incomplete" note.
//
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
// =============================================================================

"use client";

import { useEffect, useRef, useState } from "react";

import { Toast } from "@/app/components/Toast/Toast";
import type { Witness } from "@/app/lib/interfaces/batch";
import {
  maskAuxValue,
  shortenWitnessInput,
} from "@/app/(pages)/batch/_lib/witness";

import styles from "./WitnessPanel.module.scss";

export interface WitnessPanelProps {
  /** The build witness, or null/undefined when unavailable. */
  witness: Witness | null | undefined;
}

/** Confirmation lifetime for the input copy toast, in milliseconds (Req 8.7). */
const COPY_CONFIRM_MS = 3000;

/** Dev-only warning shown while real secret values are revealed (Req 8.5). */
const SECRET_WARNING = "Dev only — never expose user secrets in production.";

/** Inline note shown when the witness is missing or missing fields (Req 8.8). */
const INCOMPLETE_NOTE = "Witness incomplete — proof generation may fail.";

/**
 * Determines whether the witness is missing or missing one or more fields.
 *
 * The witness is considered incomplete (Req 8.8) when it is null/undefined, its
 * `inputs` field is absent or not an array, or its `auxiliary` field is absent.
 * Runtime guards are used because upstream data may not match the static shape.
 */
function isWitnessIncomplete(witness: Witness | null | undefined): boolean {
  if (witness == null) return true;
  if (!Array.isArray(witness.inputs)) return true;
  if (witness.auxiliary == null) return true;
  return false;
}

export function WitnessPanel({
  witness,
}: WitnessPanelProps): React.JSX.Element {
  // Collapsible block — default collapsed (Req 8.1).
  const [expanded, setExpanded] = useState(false);
  // "Show secret (dev only)" toggle — default off (Req 8.4).
  const [showSecret, setShowSecret] = useState(false);
  // Transient "Copied" confirmation for input copy (Req 8.7).
  const [copyConfirmVisible, setCopyConfirmVisible] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending confirmation timer on unmount.
  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  /** Show the copy confirmation and schedule it to disappear after 3s. */
  function showCopyConfirmation(): void {
    setCopyConfirmVisible(true);
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopyConfirmVisible(false);
      copyTimerRef.current = null;
    }, COPY_CONFIRM_MS);
  }

  /** Copy the FULL un-shortened input hex to the clipboard, then confirm. */
  function handleCopyInput(fullHex: string): void {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(fullHex)
        .then(() => {
          showCopyConfirmation();
        })
        .catch(() => {
          // The async write failed — still acknowledge so the user gets
          // feedback; the value stays on screen for manual copy.
          showCopyConfirmation();
        });
    } else {
      // Clipboard API unavailable — confirm anyway.
      showCopyConfirmation();
    }
  }

  const incomplete = isWitnessIncomplete(witness);

  // Derive the parts that are available to render (defensive against missing
  // fields, since upstream data may not match the static Witness shape).
  const inputs: string[] = Array.isArray(witness?.inputs)
    ? witness.inputs
    : [];
  const auxEntries: [string, string][] =
    witness?.auxiliary != null ? Object.entries(witness.auxiliary) : [];
  const hasAuxiliary = auxEntries.length >= 1;

  const panelId = "witness-panel-body";

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <span
            className={styles.chevron}
            data-expanded={expanded}
            aria-hidden="true"
          >
            {/* Chevron icon — rotates via CSS when expanded. */}
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className={styles.title}>Witness</span>
        </button>
      </div>

      {expanded && (
        <div id={panelId} className={styles.body}>
          {/* Inline note when witness is missing or missing fields (Req 8.8). */}
          {incomplete && (
            <p className={styles.note} role="note">
              {INCOMPLETE_NOTE}
            </p>
          )}

          {/* Inputs list (Req 8.1). Each value is shortened; copy writes the
              full, un-shortened hex (Req 8.7). */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Inputs</h4>
            {inputs.length === 0 ? (
              <p className={styles.empty}>No witness inputs.</p>
            ) : (
              <ul className={styles.inputList}>
                {inputs.map((input, index) => (
                  <li
                    key={`${index}-${input}`}
                    className={styles.inputItem}
                  >
                    <code className={styles.inputValue} title={input}>
                      {shortenWitnessInput(input)}
                    </code>
                    <button
                      type="button"
                      className={styles.copyButton}
                      aria-label={`Copy input ${index + 1}`}
                      onClick={() => handleCopyInput(input)}
                    >
                      Copy
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Auxiliary key/value table (Req 8.2) — only when ≥ 1 entry. */}
          {hasAuxiliary && (
            <div className={styles.section}>
              <div className={styles.auxHeader}>
                <h4 className={styles.sectionTitle}>Auxiliary</h4>
                <label className={styles.secretToggle}>
                  <input
                    type="checkbox"
                    checked={showSecret}
                    onChange={(e) => setShowSecret(e.target.checked)}
                  />
                  <span>Show secret (dev only)</span>
                </label>
              </div>

              {/* Dev-only warning while real secrets are revealed (Req 8.5). */}
              {showSecret && (
                <p className={styles.warning} role="alert">
                  {SECRET_WARNING}
                </p>
              )}

              <table className={styles.auxTable}>
                <thead>
                  <tr>
                    <th scope="col" className={styles.th}>
                      Key
                    </th>
                    <th scope="col" className={styles.th}>
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {auxEntries.map(([key, value]) => (
                    <tr key={key} className={styles.row}>
                      <td className={`${styles.td} ${styles.mono}`}>{key}</td>
                      {/* Secret values are masked when the toggle is off
                          (Req 8.3) and re-masked when toggled off (Req 8.6). */}
                      <td className={`${styles.td} ${styles.mono}`}>
                        {maskAuxValue(key, value, showSecret)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Copy confirmation — English-only, mirrors the 3s lifetime. */}
          <Toast
            message="Copied"
            visible={copyConfirmVisible}
            durationMs={COPY_CONFIRM_MS}
          />
        </div>
      )}
    </section>
  );
}

export default WitnessPanel;
