// =============================================================================
// Overview Screen (FE-03) — CtaSuggestion
// -----------------------------------------------------------------------------
// Renders a contextual call-to-action link based on the current AppState.
// Calls getNextCta(state) and returns null (no DOM output) when no CTA applies.
//
// Props:
//   - state: AppState — full pipeline state used to derive the next CTA
//
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
// =============================================================================

import Link from "next/link";
import type { AppState } from "@/app/lib/interfaces/state";
import { getNextCta } from "@/app/(pages)/overview/_lib/getNextCta";
import styles from "./CtaSuggestion.module.scss";

export interface CtaSuggestionProps {
  /** Full pipeline state used to derive the next contextual CTA. */
  state: AppState;
}

/**
 * CtaSuggestion — renders the next recommended action as a navigable link,
 * or nothing when no CTA condition is met.
 */
export function CtaSuggestion({ state }: CtaSuggestionProps): React.JSX.Element | null {
  const result = getNextCta(state);

  // No matching CTA condition — render nothing.
  if (result === null) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <Link href={result.href} className={styles.ctaLink}>
        {result.label}
      </Link>
    </div>
  );
}

export default CtaSuggestion;
