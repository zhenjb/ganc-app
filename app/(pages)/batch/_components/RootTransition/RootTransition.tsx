// =============================================================================
// FE-06 Batch Screen — RootTransition
// -----------------------------------------------------------------------------
// Visualizes the state root transition produced by a successful batch build:
// `oldStateRoot → newStateRoot`. Each root is read dynamically from
// `commitments.publicInputs` (never hardcoded) and rendered as a shortened hex
// label via `shortenHex(value, 6, 4)`.
//
// Interactions:
//   - Hovering a root surfaces the full hex value through the `title` attribute.
//   - Clicking a root opens the shared `HexRevealModal`, which reveals the full
//     value plus a Copy button with a 2000ms "Copied" confirmation; the modal
//     closes via its close button or the Escape key.
//
// A root that is missing/empty/"0x" (per `isMissingRoot`) is highlighted in red
// and carries an English text/aria indicator so the missing state is not
// conveyed by color alone.
//
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
// =============================================================================

"use client";

import { useState } from "react";

import { HexRevealModal } from "@/app/(pages)/batch/_components/HexRevealModal/HexRevealModal";
import { isMissingRoot } from "@/app/(pages)/batch/_lib/roots";
import type { SettlementUpdate } from "@/app/lib/interfaces/batch";
import type { HexString } from "@/app/lib/interfaces/state";
import { shortenHex } from "@/app/lib/services/format";

import styles from "./RootTransition.module.scss";

/** The two state roots displayed by this component, in transition order. */
type RootKey = "oldStateRoot" | "newStateRoot";

interface RootEntry {
  key: RootKey;
  /** English label used for the chip and the modal accessible name. */
  label: string;
  value: HexString;
}

export interface RootTransitionProps {
  /** Settlement update read for `oldStateRoot` / `newStateRoot` (Req 5.7). */
  publicInputs: SettlementUpdate;
}

/**
 * RootTransition — renders `oldStateRoot → newStateRoot` with hover tooltips
 * and a click-to-reveal modal.
 */
export function RootTransition({
  publicInputs,
}: RootTransitionProps): React.JSX.Element {
  // Which root (if any) is currently expanded in the reveal modal.
  const [openRoot, setOpenRoot] = useState<RootKey | null>(null);

  // Values are read dynamically from publicInputs — nothing is hardcoded.
  const roots: RootEntry[] = [
    {
      key: "oldStateRoot",
      label: "Old state root",
      value: publicInputs.oldStateRoot,
    },
    {
      key: "newStateRoot",
      label: "New state root",
      value: publicInputs.newStateRoot,
    },
  ];

  const activeRoot = roots.find((entry) => entry.key === openRoot) ?? null;

  return (
    <section className={styles.root} aria-label="State root transition">
      <div className={styles.transition}>
        {roots.map((entry, index) => {
          const missing = isMissingRoot(entry.value);
          return (
            <div key={entry.key} className={styles.cell}>
              {/* Arrow separator rendered before every root except the first. */}
              {index > 0 && (
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              )}

              <button
                type="button"
                className={`${styles.rootButton} ${
                  missing ? styles.missing : ""
                }`}
                // Hover shows the full hex value (Req 5.3). Falsy values
                // (e.g. "") collapse to no tooltip.
                title={entry.value || undefined}
                aria-label={
                  missing
                    ? `${entry.label}: missing value`
                    : `${entry.label}: ${entry.value}`
                }
                onClick={() => setOpenRoot(entry.key)}
              >
                <span className={styles.rootLabel}>{entry.label}</span>
                <span className={styles.rootValue}>
                  {shortenHex(entry.value, 6, 4)}
                </span>
                {/* Text indicator so the missing state is not color-only. */}
                {missing && (
                  <span className={styles.missingTag}>Missing</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Reveal modal — full value + copy with a 2s confirmation (Req 5.4/5.5).
          Kept mounted so its own open/close effects can run; `open` gates it. */}
      <HexRevealModal
        open={activeRoot !== null}
        value={activeRoot?.value ?? ""}
        label={activeRoot?.label ?? ""}
        copyConfirmMs={2000}
        onClose={() => setOpenRoot(null)}
      />
    </section>
  );
}

export default RootTransition;
