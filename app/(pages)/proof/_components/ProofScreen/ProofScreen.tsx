// =============================================================================
// Proof Screen (FE-07) — ProofScreen orchestrator
// -----------------------------------------------------------------------------
// Owns the proof generation lifecycle and composes all sub-components. Reads
// commitments + witness from BatchSessionContext, drives proof generation via
// `useProofGenerate`, and renders the result (ProofBundle) or error states.
//
// Empty state: When commitments or witness is null the screen displays a
// message "Session expired — rebuild the batch." with a "Back to Batch" link
// (navigates to /batch).
//
// Generate Proof button:
//   - Disabled when session is empty (commitments/witness null).
//   - `aria-busy` + `aria-disabled` while generating (Req 10.6).
//
// Confirm overwrite dialog:
//   - When proofBundle !== null and user clicks "Generate Proof", a native
//     <dialog> modal confirms the user wants to replace the current proof.
//   - Cancel: closes dialog, keeps existing proof (Req 9.3).
//   - Confirm: closes dialog, proceeds with generate (Req 9.2).
//   - When proofBundle === null: generates directly without confirm (Req 9.4).
//
// Error handling:
//   - API error (non-timeout): banner "Internal Server Error"
//   - Timeout: banner with timeout indicator + "Retry" button
//   - Error resets on retry (Req 5.5).
//
// Requirements: 1.1–1.5, 2.7, 4.5, 5.2, 5.4, 5.5, 8.1, 8.2, 8.3, 9.1–9.4, 10.6
// =============================================================================

"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import { AnnouncementBanner } from "@/app/components/AnnouncementBanner/AnnouncementBanner";
import { useBatchSession } from "@/app/lib/contexts/BatchSessionContext";
import type { AppState } from "@/app/lib/interfaces/state";
import type { ProofGenerateInput } from "@/app/lib/interfaces/proof";

import { useProofGenerate } from "../../_lib/useProofGenerate";
import { ProofStatusBadge } from "../ProofStatusBadge/ProofStatusBadge";
import { ProofProgress } from "../ProofProgress/ProofProgress";
import { ProofBytesPanel } from "../ProofBytesPanel/ProofBytesPanel";
import { PublicInputsTable } from "../PublicInputsTable/PublicInputsTable";
import { VerificationKeyChip } from "../VerificationKeyChip/VerificationKeyChip";

import styles from "./ProofScreen.module.scss";

export interface ProofScreenProps {
  /** Loaded app state — always non-null at this layer. */
  state: AppState;
  /** Refresh the shared app state after proof generation. */
  refresh: () => Promise<void>;
  /** `true` while an app-state fetch is in flight. */
  inFlight: boolean;
}

/** UI strings. */
const EMPTY_STATE_MESSAGE = "Session expired — rebuild the batch.";
const ERROR_MESSAGE = "Internal Server Error";
const TIMEOUT_MESSAGE = "Proof generation timed out (60s).";
const CONFIRM_MESSAGE =
  "The current proof will be replaced. Do you want to continue?";

/**
 * ProofScreen — orchestrator for the /proof page.
 */
export function ProofScreen({
  refresh,
  inFlight: _inFlight,
}: ProofScreenProps): React.JSX.Element {
  const session = useBatchSession();

  const {
    proofStatus,
    proofBundle,
    error,
    timedOut,
    invalidInputs,
    generate,
    clearError,
  } = useProofGenerate({ refresh });

  // Confirm overwrite dialog state (Req 9.1–9.4).
  const [showConfirm, setShowConfirm] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Empty state: session has no batch data.
  const sessionEmpty =
    session.commitments === null || session.witness === null;

  const isGenerating = proofStatus === "generating";

  /**
   * Execute the actual proof generation call. Shared between the direct path
   * (proofBundle === null) and the confirm path (user confirmed overwrite).
   */
  async function executeGenerate(): Promise<void> {
    if (sessionEmpty) return;

    // Clear previous error before starting a new request (Req 5.5).
    clearError();

    const input: ProofGenerateInput = {
      settlementUpdate: session.commitments!.publicInputs,
      batchCommitments: session.commitments!,
      witness: session.witness!,
    };
    await generate(input);
  }

  /**
   * Handle "Generate Proof" click. If proofBundle already exists, show a
   * confirm dialog before overwriting (Req 9.1). If proofBundle is null,
   * proceed directly (Req 9.4).
   */
  function handleGenerate(): void {
    if (sessionEmpty) return;

    if (proofBundle !== null) {
      // Show confirm dialog (Req 9.1).
      setShowConfirm(true);
      // Use showModal() for native focus trap + backdrop.
      dialogRef.current?.showModal();
    } else {
      // No existing proof — generate directly (Req 9.4).
      void executeGenerate();
    }
  }

  /**
   * Handle confirm button in overwrite dialog: close dialog and proceed with
   * proof generation (Req 9.2).
   */
  function handleConfirmOverwrite(): void {
    setShowConfirm(false);
    dialogRef.current?.close();
    void executeGenerate();
  }

  /**
   * Handle cancel button in overwrite dialog: close dialog and keep the
   * existing proofBundle untouched (Req 9.3).
   */
  function handleCancelOverwrite(): void {
    setShowConfirm(false);
    dialogRef.current?.close();
  }

  /**
   * Handle "Retry" click after timeout. Same as direct generate (Req 5.5).
   */
  function handleRetry(): void {
    void executeGenerate();
  }

  return (
    <div className={styles.screen}>
      {/* Status badge — always visible (Req 1.1–1.3). */}
      <div className={styles.header}>
        <ProofStatusBadge status={proofStatus} />
      </div>

      {/* Progress bar while generating (Req 1.4, 1.5). */}
      <ProofProgress active={isGenerating} />

      {/* Error banner — API error (non-timeout) (Req 5.2). */}
      {error && !timedOut && (
        <AnnouncementBanner variant="error" message={ERROR_MESSAGE} />
      )}

      {/* Timeout banner with Retry button (Req 4.5). */}
      {error && timedOut && (
        <div className={styles.timeoutBanner}>
          <AnnouncementBanner
            variant="error"
            message={TIMEOUT_MESSAGE}
            action={
              <button
                type="button"
                className={styles.retryButton}
                onClick={handleRetry}
              >
                Retry
              </button>
            }
          />
        </div>
      )}

      {/* Empty state: session expired or missing data (Req 8.1, 8.2, 8.3). */}
      {sessionEmpty && (
        <div className={styles.emptyState}>
          <p className={styles.emptyMessage}>{EMPTY_STATE_MESSAGE}</p>
          <Link href="/batch" className={styles.backLink}>
            Back to Batch
          </Link>
        </div>
      )}

      {/* Generate Proof button (Req 2.7, 10.6). */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.generateButton}
          disabled={sessionEmpty || isGenerating}
          aria-busy={isGenerating}
          aria-disabled={isGenerating || undefined}
          onClick={handleGenerate}
        >
          {isGenerating ? "Generating…" : "Generate Proof"}
        </button>
      </div>

      {/* Confirm overwrite dialog (Req 9.1–9.4). */}
      <dialog
        ref={dialogRef}
        className={styles.confirmDialog}
        aria-labelledby="confirm-overwrite-title"
        onCancel={handleCancelOverwrite}
      >
        {showConfirm && (
          <div className={styles.confirmContent}>
            <p id="confirm-overwrite-title" className={styles.confirmMessage}>
              {CONFIRM_MESSAGE}
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={handleConfirmOverwrite}
              >
                Overwrite
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleCancelOverwrite}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </dialog>

      {/* Invalid inputs warning (Req 3.6). */}
      {invalidInputs && (
        <AnnouncementBanner
          variant="warning"
          message="Invalid public inputs — expected exactly 6 elements."
        />
      )}

      {/* Proof result sections — rendered only when proofStatus === "ready". */}
      {proofStatus === "ready" && proofBundle !== null && (
        <div className={styles.results}>
          <ProofBytesPanel proof={proofBundle.proof} />
          <PublicInputsTable
            publicInputs={proofBundle.publicInputs}
            invalid={invalidInputs}
          />
          <VerificationKeyChip keyId={proofBundle.verificationKeyId} />
        </div>
      )}
    </div>
  );
}

export default ProofScreen;
