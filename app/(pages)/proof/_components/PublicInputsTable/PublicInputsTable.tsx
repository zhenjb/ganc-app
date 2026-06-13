// =============================================================================
// Proof Screen (FE-07) — PublicInputsTable
// -----------------------------------------------------------------------------
// Renders a semantic HTML table displaying the 6 public inputs of a settlement
// proof in the fixed order defined by PUBLIC_INPUT_LABELS.
//
// Columns: Index, Label, Value (shortened hex), Explanation.
//
// When `invalid` is true (publicInputs.length !== 6), a red warning is shown
// above the table, but available data rows are still rendered for debugging.
//
// Requirements: 6.5, 6.6, 10.5
// =============================================================================

import type { HexString } from "@/app/lib/interfaces/state";
import {
  PUBLIC_INPUT_LABELS,
  type PublicInputLabel,
} from "@/app/constants/zkInputs";
import { shortenHex } from "@/app/(pages)/proof/_lib/format";
import styles from "./PublicInputsTable.module.scss";

export interface PublicInputsTableProps {
  publicInputs: HexString[];
  /** True when publicInputs.length !== 6 */
  invalid: boolean;
}

/**
 * Maps a PublicInputLabel to a human-readable English explanation string.
 */
function getLabelExplanation(label: PublicInputLabel): string {
  const explanations: Record<PublicInputLabel, string> = {
    oldStateRoot: "Previous state root before batch",
    newStateRoot: "New state root after batch",
    depositsRoot: "Merkle root of deposits in batch",
    withdrawalsRoot: "Merkle root of withdrawals in batch",
    nullifiersRoot: "Root of nullifier set",
    withdrawOutputsRoot: "Root of withdrawal outputs",
  };

  return explanations[label];
}

export function PublicInputsTable({
  publicInputs,
  invalid,
}: PublicInputsTableProps): React.JSX.Element {
  return (
    <div className={styles.container}>
      {invalid && (
        <p className={styles.warning} role="alert">
          Invalid public inputs
        </p>
      )}

      <table className={styles.table}>
        <caption className={styles.caption}>
          Public inputs for settlement proof
        </caption>
        <thead>
          <tr>
            <th scope="col" className={styles.th}>
              Index
            </th>
            <th scope="col" className={styles.th}>
              Label
            </th>
            <th scope="col" className={styles.th}>
              Value
            </th>
            <th scope="col" className={styles.th}>
              Explanation
            </th>
          </tr>
        </thead>
        <tbody>
          {PUBLIC_INPUT_LABELS.map((label, index) => (
            <tr key={label} className={styles.row}>
              <td className={styles.td}>{index}</td>
              <td className={`${styles.td} ${styles.label}`}>{label}</td>
              <td className={`${styles.td} ${styles.mono}`}>
                {index < publicInputs.length
                  ? shortenHex(publicInputs[index])
                  : "—"}
              </td>
              <td className={styles.td}>{getLabelExplanation(label)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PublicInputsTable;
