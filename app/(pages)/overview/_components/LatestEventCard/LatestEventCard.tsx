// =============================================================================
// LatestEventCard — generic card shell for the Latest Events panel.
// -----------------------------------------------------------------------------
// Renders a titled card with a content slot. When `isEmpty` is true the card
// shows `emptyMessage` instead of `children`, giving each event sub-card a
// consistent empty-state presentation.
//
// Requirements covered: 4.2, 4.4, 4.6
// =============================================================================

import type { ReactNode } from "react";
import styles from "./LatestEventCard.module.scss";

export interface LatestEventCardProps {
  /** Card heading text. */
  title: string;
  /** Content rendered when the card has data. */
  children: ReactNode;
  /**
   * When true the card renders `emptyMessage` instead of `children`.
   * Defaults to false.
   */
  isEmpty?: boolean;
  /** Fallback text shown when `isEmpty` is true. */
  emptyMessage?: string;
}

export function LatestEventCard({
  title,
  children,
  isEmpty = false,
  emptyMessage,
}: LatestEventCardProps): React.ReactElement {
  return (
    <section className={styles.card} aria-label={title}>
      <h3 className={styles.heading}>{title}</h3>
      <div className={styles.content}>
        {isEmpty ? (
          <p className={styles.emptyMessage}>{emptyMessage}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export default LatestEventCard;
