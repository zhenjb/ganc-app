import type { DepositRecord } from "@/app/lib/interfaces/deposit";
import type { WalletConnection } from "@/app/lib/interfaces/wallet";

/**
 * Form state for the deposit form.
 * Tracks user input for depositor address, denomination, and amount.
 */
export interface DepositFormState {
  depositor: string;
  denom: string;
  amount: string;
}

/**
 * Validation errors that block form submission.
 * A null value means the field is valid.
 */
export interface ValidationErrors {
  depositor: string | null;
  amount: string | null;
}

/**
 * Validation warnings that do not block submission.
 * A null value means no warning for the field.
 */
export interface ValidationWarnings {
  amount: string | null;
}

/**
 * A single entry in the client-side deposit history list.
 * Not persisted across page reloads.
 */
export interface DepositHistoryEntry {
  deposit: DepositRecord;
  /** ISO 8601 timestamp of when the deposit was recorded client-side. */
  timestamp: string;
}

/**
 * Session-only wallet connection state for the deposit form (FE-14).
 * Never persisted to localStorage — reload forces a fresh Connect flow.
 */
export interface WalletState {
  connection: WalletConnection | null;
  connecting: boolean;
  /** Normalized "Internal Server Error" or null. */
  error: string | null;
}
