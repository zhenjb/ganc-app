// =============================================================================
// BatchCardContent — renders the latest batch commitments inside a LatestEventCard.
// -----------------------------------------------------------------------------
// Displays: shortened batchHash and 6 publicInputs fields in fixed order:
//   [oldStateRoot, newStateRoot, depositsRoot, withdrawalsRoot,
//    nullifiersRoot, withdrawOutputsRoot]
//
// If any of the 6 keys is missing, renders an AnnouncementBanner warning
// inline while still rendering available fields.
//
// Shows empty state when batchCommitments is null/undefined.
//
// Requirements covered: 4.5, 4.6, 4.7
// =============================================================================

import type { BatchCommitments, SettlementUpdate } from "@/app/lib/interfaces/batch";
import { shortenHex } from "@/app/lib/services/format";
import AnnouncementBanner from "@/app/components/AnnouncementBanner/AnnouncementBanner";
import { LatestEventCard } from "./LatestEventCard";

export interface BatchCardContentProps {
  batchCommitments: BatchCommitments | null | undefined;
}

/** Fixed display order for the 6 publicInputs fields (Req 4.5). */
const PUBLIC_INPUT_KEYS: (keyof SettlementUpdate)[] = [
  "oldStateRoot",
  "newStateRoot",
  "depositsRoot",
  "withdrawalsRoot",
  "nullifiersRoot",
  "withdrawOutputsRoot",
];

/** Human-readable labels for each publicInputs field. */
const PUBLIC_INPUT_LABELS: Record<keyof SettlementUpdate, string> = {
  oldStateRoot: "Old State Root",
  newStateRoot: "New State Root",
  depositsRoot: "Deposits Root",
  withdrawalsRoot: "Withdrawals Root",
  nullifiersRoot: "Nullifiers Root",
  withdrawOutputsRoot: "Withdraw Outputs Root",
};

export function BatchCardContent({
  batchCommitments,
}: BatchCardContentProps): React.ReactElement {
  const hasInvalidInputs =
    batchCommitments != null &&
    PUBLIC_INPUT_KEYS.some(
      (key) =>
        batchCommitments.publicInputs?.[key] == null ||
        batchCommitments.publicInputs?.[key] === ""
    );

  return (
    <LatestEventCard
      title="Latest Batch"
      isEmpty={!batchCommitments}
      emptyMessage="No batch yet"
    >
      {batchCommitments != null && (
        <>
          {hasInvalidInputs && (
            <AnnouncementBanner
              variant="warning"
              message="Invalid public inputs"
            />
          )}
          <dl>
            <div>
              <dt>Batch Hash</dt>
              <dd>{shortenHex(batchCommitments.batchHash, 6, 4)}</dd>
            </div>
            {PUBLIC_INPUT_KEYS.map((key) => {
              const value = batchCommitments.publicInputs?.[key];
              return (
                <div key={key}>
                  <dt>{PUBLIC_INPUT_LABELS[key]}</dt>
                  <dd>
                    {value != null && value !== ""
                      ? shortenHex(value, 6, 4)
                      : "—"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </>
      )}
    </LatestEventCard>
  );
}

export default BatchCardContent;
