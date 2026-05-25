import type { AppState } from "@/app/lib/interfaces/state";

export const mockState: AppState = {
  mode: "mock",
  currentStateRoot:
    "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1",
  balances: {
    userBalances: {
      "cosmos1aliceaddressexample123456789/uusdc": "1000",
    },
    moduleAccountBalance: "60",
  },
  depositStatus: "processed",
  withdrawStatus: "idle",
  proofStatus: "idle",
  batchStatus: "idle",
  latestDeposit: null,
  latestWithdraw: null,
  batchCommitments: null,
};
