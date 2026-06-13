// =============================================================================
// FE-06 Batch Screen — HexRevealModal
// -----------------------------------------------------------------------------
// A small, reusable modal that reveals the full hex value behind a shortened
// label (used by RootTransition, WithdrawalsTable, and CommitmentsCard). It
// shows the complete value plus a Copy button; copying writes the full value
// to the clipboard and surfaces an English "Copied" confirmation that
// disappears after `copyConfirmMs` (2000ms from the root transition, 3000ms
// from the tables).
//
// Closing affordances:
//   - The close button.
//   - The Escape key (shared `useEscapeKey` hook, gated by `open`).
//   - A pointer-down outside the modal panel (shared `useOnClickOutside` hook).
//
// Confirmation reuses the shared `Toast` live region so screen readers announce
// the copy. This component owns only the transient confirmation timer; all
// open/close state is controlled by the parent.
//
// Requirements: 5.4, 5.5, 5.6, 6.7, 6.8, 7.9
// =============================================================================

"use client";

import { useEffect, useRef, useState } from "react";

import { Toast } from "@/app/components/Toast/Toast";
import { useEscapeKey } from "@/app/lib/hooks/useEscapeKey";
import { useOnClickOutside } from "@/app/lib/hooks/useOnClickOutside";
import type { HexString } from "@/app/lib/interfaces/state";

import styles from "./HexRevealModal.module.scss";

export interface HexRevealModalProps {
  /** Whether the modal is currently open. */
  open: boolean;
  /** The full hex value to reveal and copy. */
  value: HexString;
  /** English label describing the value (used as the dialog accessible name). */
  label: string;
  /** Confirmation lifetime in milliseconds (2000 for roots, 3000 for tables). */
  copyConfirmMs: number;
  /** Invoked when the user requests to close the modal. */
  onClose: () => void;
}

/**
 * HexRevealModal — reveals a full hex value with copy-to-clipboard support.
 *
 * Hooks are always called unconditionally; the component returns `null` while
 * `open` is false so the dialog (and its click-outside listener) is only live
 * when visible.
 */
export function HexRevealModal({
  open,
  value,
  label,
  copyConfirmMs,
  onClose,
}: HexRevealModalProps): React.JSX.Element | null {
  // The panel is the "inside" region for click-outside detection.
  const panelRef = useRef<HTMLDivElement>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  // Tracks the pending confirmation timeout so it can be cleared/reset.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Escape closes the modal, but only while it is open.
  useEscapeKey(onClose, open);

  // A pointer-down anywhere outside the panel closes the modal.
  useOnClickOutside(panelRef, () => {
    if (open) onClose();
  });

  // When the modal closes (or unmounts), clear any pending confirmation timer.
  // The state reset is unnecessary here because `confirmVisible` is only read
  // while `open` is true (the component returns null otherwise), and we reset
  // it synchronously below before rendering content.
  useEffect(() => {
    if (!open) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [open]);

  // Reset confirmation visibility synchronously when the modal is closed.
  // This ensures it starts fresh on the next open without needing an effect.
  if (!open && confirmVisible) {
    setConfirmVisible(false);
  }

  /** Show the confirmation and schedule it to disappear after copyConfirmMs. */
  function showConfirmation(): void {
    setConfirmVisible(true);
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setConfirmVisible(false);
      timerRef.current = null;
    }, copyConfirmMs);
  }

  /** Copy the full value to the clipboard, then confirm. */
  function handleCopy(): void {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(value)
        .then(() => {
          showConfirmation();
        })
        .catch(() => {
          // The async write failed — still acknowledge the action so the user
          // gets feedback; the full value stays on screen for manual copy.
          showConfirmation();
        });
    } else {
      // Clipboard API unavailable — confirm anyway; the value remains visible.
      showConfirmation();
    }
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation">
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{label}</h2>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close"
            onClick={onClose}
          >
            {/* Close (X) icon — decorative; the button is labelled above. */}
            <svg
              aria-hidden="true"
              focusable="false"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {/* The full, un-shortened hex value, selectable for manual copy. */}
          <code className={styles.value}>{value}</code>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.copyButton}
            onClick={handleCopy}
          >
            Copy
          </button>
        </div>

        {/* Copy confirmation — English-only, mirrors copyConfirmMs lifetime. */}
        <Toast message="Copied" visible={confirmVisible} durationMs={copyConfirmMs} />
      </div>
    </div>
  );
}

export default HexRevealModal;
