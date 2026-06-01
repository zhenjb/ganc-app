"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BatchCommitments, Witness } from "@/app/lib/interfaces/batch";

/**
 * Shape of the in-memory batch session shared between FE-06 (Batch) and
 * FE-07 (Proof). It holds the result of a successful `POST /api/batch/build`
 * so the Proof screen can call `postProofGenerate` without rebuilding the
 * batch (Req 9.2, 9.3, 9.4).
 *
 * The session lives entirely in RAM via `useState`. It is intentionally NOT
 * serialized to the URL, `localStorage`, or `sessionStorage` so secrets in
 * the witness never leak to disk or shareable links (Req 9.2).
 */
export interface BatchSession {
  /** Commitments from the latest successful build, or `null` before any build. */
  commitments: BatchCommitments | null;
  /** Witness from the latest successful build, or `null` before any build. */
  witness: Witness | null;
  /**
   * `true` when the user changed the selection after a successful build, so the
   * displayed batch no longer matches the current selection (Req 10.4, 10.5).
   */
  stale: boolean;
  /** Store a freshly built batch and clear the stale flag (Req 9.1, 10.6). */
  setBatch: (b: {
    commitments: BatchCommitments | null;
    witness: Witness | null;
  }) => void;
  /** Mark the current batch stale (selection changed after build, Req 10.4). */
  markStale: () => void;
  /** Reset the session back to its empty initial state. */
  reset: () => void;
}

const BatchSessionContext = createContext<BatchSession | null>(null);

/**
 * Provider that owns the in-memory batch session. Mount inside
 * `app/(pages)/layout.tsx` alongside `AppStateProvider` so every page in the
 * route group shares the same session instance (Req 9.3).
 *
 * State is held in RAM only — there is no persistence layer by design (Req 9.2).
 */
export function BatchSessionProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [commitments, setCommitments] = useState<BatchCommitments | null>(null);
  const [witness, setWitness] = useState<Witness | null>(null);
  const [stale, setStale] = useState<boolean>(false);

  const setBatch = useCallback(
    (b: { commitments: BatchCommitments | null; witness: Witness | null }) => {
      setCommitments(b.commitments);
      setWitness(b.witness);
      // A freshly built batch is always in sync with the current selection.
      setStale(false);
    },
    [],
  );

  const markStale = useCallback(() => {
    setStale(true);
  }, []);

  const reset = useCallback(() => {
    setCommitments(null);
    setWitness(null);
    setStale(false);
  }, []);

  const value = useMemo<BatchSession>(
    () => ({ commitments, witness, stale, setBatch, markStale, reset }),
    [commitments, witness, stale, setBatch, markStale, reset],
  );

  return (
    <BatchSessionContext.Provider value={value}>
      {children}
    </BatchSessionContext.Provider>
  );
}

/**
 * Hook for consuming the shared {@link BatchSession}. Throws when used outside
 * a `<BatchSessionProvider>` so misconfiguration fails loudly during
 * development (mirrors `useAppStateContext`).
 */
export function useBatchSessionContext(): BatchSession {
  const ctx = useContext(BatchSessionContext);
  if (!ctx) {
    throw new Error(
      "useBatchSessionContext must be used inside <BatchSessionProvider>.",
    );
  }
  return ctx;
}

/** Convenience alias for {@link useBatchSessionContext}. */
export function useBatchSession(): BatchSession {
  return useBatchSessionContext();
}
