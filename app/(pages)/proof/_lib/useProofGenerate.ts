"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postProofGenerate } from "@/app/lib/services/api";
import { ApiError } from "@/app/lib/interfaces/api";
import type { ProofBundle, ProofGenerateInput } from "@/app/lib/interfaces/proof";
import type {
  ProofGenerationStatus,
  UseProofGenerateOptions,
  UseProofGenerateResult,
} from "../_types";
import { createProofTimeout } from "./proofTimeout";
import { validateProofBundle } from "./validate";

/**
 * Manages the proof generation lifecycle (FE-07).
 *
 * Guarantees:
 *   - `generate()` returns early while a request is already in flight,
 *     preventing double-submit (Req 2.5).
 *   - Sets proofStatus to "generating" and creates a 60s AbortController
 *     timeout before firing the request (Req 2.2, 4.1).
 *   - On success with valid proof: stores proofBundle, sets status "ready",
 *     calls onSuccess + refresh (Req 2.3).
 *   - On empty proof (proof === "" or "0x"): sets error, does NOT store bundle
 *     (Req 2.6, 3.4).
 *   - On invalid inputs (length !== 6) but non-empty proof: sets invalidInputs
 *     warning, still stores bundle and sets status "ready" (Req 3.5).
 *   - On error/timeout: sets status "idle", error flag (+ timedOut if abort),
 *     does NOT overwrite existing proofBundle (Req 2.4, 4.4, 5.1, 5.3).
 *   - Clears timeout on success, error, and unmount to prevent memory leaks
 *     (Req 4.2, 4.6).
 */
export function useProofGenerate(
  options: UseProofGenerateOptions,
): UseProofGenerateResult {
  const { refresh, onSuccess } = options;

  const [proofStatus, setProofStatus] = useState<ProofGenerationStatus>("idle");
  const [proofBundle, setProofBundle] = useState<ProofBundle | null>(null);
  const [error, setError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [invalidInputs, setInvalidInputs] = useState(false);

  // Synchronous in-flight guard. React state updates are async, so proofStatus
  // can lag behind rapid calls. This ref is the authoritative gate for the
  // single-in-flight invariant (Req 2.5).
  const inFlightRef = useRef(false);

  // Keep a ref to the current timeout's clear function so we can invoke it on
  // unmount to prevent memory leaks from dangling setTimeouts (Req 4.6).
  const clearRef = useRef<(() => void) | null>(null);

  // Keep the latest injected callbacks in refs so `generate` keeps a stable
  // identity and always sees the current functions without re-subscribing.
  const refreshRef = useRef(refresh);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    refreshRef.current = refresh;
    onSuccessRef.current = onSuccess;
  }, [refresh, onSuccess]);

  // Cleanup on unmount: clear any pending timeout to avoid memory leaks from
  // setTimeout still running after the component unmounts (Req 4.6).
  useEffect(() => {
    return () => {
      clearRef.current?.();
    };
  }, []);

  const generate = useCallback(
    async (input: ProofGenerateInput): Promise<void> => {
      // Guard: prevent double-submit (Req 2.5).
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      // Reset state before starting (Req 5.5).
      setProofStatus("generating");
      setError(false);
      setTimedOut(false);
      setInvalidInputs(false);

      // Create 60s timeout (Req 2.2, 4.1).
      const { signal, clear } = createProofTimeout(60_000);
      clearRef.current = clear;

      try {
        const response = await postProofGenerate(input, { signal });
        clear();
        clearRef.current = null;

        // Validate proof bundle (Req 3.4, 3.5).
        const bundle = response.proofBundle;
        const validation = validateProofBundle(bundle);

        if (validation.emptyProof) {
          // Empty proof → treat as failure (Req 2.6, 3.4).
          setProofStatus("idle");
          setError(true);
          return;
        }

        if (validation.invalidInputs) {
          // Invalid inputs → warning, still store bundle (Req 3.5).
          setInvalidInputs(true);
        }

        // Success: store bundle and transition to "ready" (Req 2.3).
        setProofBundle(bundle);
        setProofStatus("ready");
        onSuccessRef.current?.(response);

        // Post-render refresh. A rejected refresh does not affect the result.
        void refreshRef.current().catch(() => {});
      } catch (err) {
        clear();
        clearRef.current = null;

        // Detect timeout via ApiError.aborted (Req 4.4).
        if (err instanceof ApiError && err.aborted) {
          setTimedOut(true);
        }

        // On failure: reset to idle, flag error, keep existing proofBundle
        // untouched (Req 2.4, 5.1, 5.3).
        setProofStatus("idle");
        setError(true);
      } finally {
        inFlightRef.current = false;
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(false);
    setTimedOut(false);
  }, []);

  return {
    proofStatus,
    proofBundle,
    error,
    timedOut,
    invalidInputs,
    generate,
    clearError,
  };
}
