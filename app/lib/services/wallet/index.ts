// Barrel export for the wallet service. Pages should import from here only.
export { connectWallet, broadcastDeposit } from "./walletClient";
export {
  MSG_DEPOSIT_TYPE_URL,
  EVENT_DEPOSIT_TYPE,
  MsgDeposit,
  buildDepositRegistry,
} from "./msgDeposit";
export { getChainSpec, getChainInfo } from "./chainConfig";
export type { ChainSpec } from "./chainConfig";
