// =============================================================================
// RecordTable — generic shared table for rendering record lists.
// -----------------------------------------------------------------------------
// A reusable, column-configurable table component used by DepositHistoryList,
// WithdrawRequestHistory, and any future record list. Accepts column definitions
// that describe header labels and per-row render functions, making each consumer
// responsible only for defining its own columns.
//
// Features:
// - Generic type parameter <T> for type-safe row data
// - Configurable columns with header, render, and optional alignment/width
// - Built-in empty state with customizable message
// - Responsive: horizontal scroll on narrow viewports
// - Dark mode support via :global(.dark) overrides
// =============================================================================

import type { ReactNode } from "react";
import styles from "./RecordTable.module.scss";

/**
 * Defines how a single column is rendered.
 */
export interface ColumnDef<T> {
  /** Unique key for React list rendering. */
  key: string;
  /** Column header label. */
  header: string;
  /** Render function for a cell given the row data. */
  render: (row: T) => ReactNode;
  /** Optional text alignment. Defaults to "left". */
  align?: "left" | "center" | "right";
  /** Optional CSS width (e.g. "120px", "30%"). */
  width?: string;
}

export interface RecordTableProps<T> {
  /** Section heading displayed above the table. */
  title: string;
  /** Column definitions. */
  columns: ColumnDef<T>[];
  /** Row data array. */
  data: T[];
  /** Unique key extractor for each row. */
  rowKey: (row: T) => string;
  /** Message shown when data is empty. Defaults to "No records yet". */
  emptyMessage?: string;
}

export function RecordTable<T>({
  title,
  columns,
  data,
  rowKey,
  emptyMessage = "No records yet",
}: RecordTableProps<T>): React.JSX.Element {
  return (
    <section className={styles.container}>
      <h2 className={styles.heading}>{title}</h2>

      {data.length === 0 ? (
        <p className={styles.empty}>{emptyMessage}</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={styles.th}
                    style={{
                      textAlign: col.align ?? "left",
                      width: col.width,
                    }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={rowKey(row)} className={styles.tr}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={styles.td}
                      style={{ textAlign: col.align ?? "left" }}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default RecordTable;
