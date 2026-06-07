// =============================================================================
// Overview Screen (FE-03) — BalanceTable
// -----------------------------------------------------------------------------
// Displays user balances from the zkdex state and the module account balances.
//
// Props:
//   - userBalances: Record<string, string>          — keyed "{address}/{denom}"
//   - moduleAccountBalance: Record<string, string>  — keyed by denom
//
// Key parsing rules for userBalances entries:
//   - Keys are formatted as "address/denom" — split at the last "/"
//   - If address part is >= 15 chars: render address.slice(0,10) + "…" + address.slice(-4)
//   - If address part is < 15 chars: render full address
//   - If key has no "/": use full key as address, "" as denom
//
// Empty state: when userBalances is {}, render "No users yet"
//
// Module account balance: one row per denom with the literal label
// "Module account balance" and the note
// "Funds locked in the zkdex module account". When the map is empty, render
// a single row with "0 USDT" so the section is never hidden.
//
// All amount formatting goes through formatAmount() which uses BigInt
// internally. On RangeError (invalid amount string), renders "—" for that
// entry.
//
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
// =============================================================================

import { formatAmount } from "@/app/lib/services/format";
import styles from "./BalanceTable.module.scss";

export interface BalanceTableProps {
  userBalances: Record<string, string>;
  moduleAccountBalance: Record<string, string>;
}

/**
 * Parses a userBalances key into { address, denom }.
 * Splits at the last "/" — everything before is the address, everything after
 * is the denom. If no "/" is present, the full key is the address and denom is "".
 */
function parseBalanceKey(key: string): { address: string; denom: string } {
  const lastSlash = key.lastIndexOf("/");
  if (lastSlash === -1) {
    return { address: key, denom: "" };
  }
  return {
    address: key.slice(0, lastSlash),
    denom: key.slice(lastSlash + 1),
  };
}

/**
 * Shortens a Cosmos address if it is >= 15 characters:
 * renders first 10 chars + "…" + last 4 chars.
 * Otherwise returns the address unchanged.
 */
function shortenAddress(address: string): string {
  if (address.length >= 15) {
    return address.slice(0, 10) + "…" + address.slice(-4);
  }
  return address;
}

/**
 * Formats an amount+denom pair via formatAmount, returning "—" on RangeError.
 */
function safeFormatAmount(amount: string, denom: string): string {
  try {
    return formatAmount(amount, denom);
  } catch (err) {
    if (err instanceof RangeError) {
      return "—";
    }
    throw err;
  }
}

export function BalanceTable({
  userBalances,
  moduleAccountBalance,
}: BalanceTableProps): React.JSX.Element {
  const userEntries = Object.entries(userBalances);
  const isEmpty = userEntries.length === 0;

  // Module rows — one per denom present in the map. When empty, fall back to
  // a single "0 USDT" row so the section is always rendered.
  const moduleEntries = Object.entries(moduleAccountBalance);
  const moduleRows: Array<{ denom: string; amount: string }> =
    moduleEntries.length === 0
      ? [{ denom: "USDT", amount: "0" }]
      : moduleEntries.map(([denom, amount]) => ({ denom, amount }));

  return (
    <section className={styles.container}>
      <h2 className={styles.heading}>User balances</h2>

      {/* User balances list or empty state */}
      {isEmpty ? (
        <p className={styles.empty}>No users yet</p>
      ) : (
        <ul className={styles.list}>
          {userEntries.map(([key, amount]) => {
            const { address, denom } = parseBalanceKey(key);
            const displayAddress = shortenAddress(address);
            const displayAmount = safeFormatAmount(amount, denom);

            return (
              <li key={key} className={styles.row}>
                <span className={styles.address} title={address}>
                  {displayAddress}
                </span>
                <span className={styles.amount}>{displayAmount}</span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Module account balances — one row per denom, always rendered */}
      {moduleRows.map(({ denom, amount }) => (
        <div key={denom} className={styles.moduleRow}>
          <div className={styles.moduleLabel}>
            <span className={styles.moduleName}>Module account balance</span>
            <span className={styles.moduleNote}>
              Funds locked in the zkdex module account
            </span>
          </div>
          <span className={styles.moduleAmount}>
            {safeFormatAmount(amount, denom)}
          </span>
        </div>
      ))}
    </section>
  );
}

export default BalanceTable;
