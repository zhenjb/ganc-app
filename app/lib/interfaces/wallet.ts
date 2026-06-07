// =============================================================================
// Wallet domain types (FE-14)
// -----------------------------------------------------------------------------
// Shared shapes for the wallet-signed deposit flow. Real signing happens in
// `app/lib/services/wallet/`; pages only consume these types.
// =============================================================================

export type WalletProvider = "keplr" | "leap";

export interface WalletConnection {
  address: string;
  chainId: string;
  provider: WalletProvider;
}

export interface BroadcastDepositResult {
  /** 0x-prefixed transaction hash returned by the chain. */
  txHash: string;
  /**
   * `deposit_id` parsed from `ob.zkdex.v1.EventDeposit` if present.
   * `null` when the chain has not yet emitted/indexed the event.
   */
  depositId: string | null;
}
