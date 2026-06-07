import type { AppState } from "@/app/lib/interfaces/state";

export const mockState: AppState = {
  mode: "local",
  currentStateRoot: "0xrootA",
  userBalances: {
    "cosmos1alice/USDT": "1000",
  },
  moduleAccountBalance: {
    USDT: "0",
  },
  latestDeposit: null,
  latestWithdrawRequest: null,
  latestSettlement: null,
  latestBatchCommitments: null,
  latestProof: null,
  latestWithdrawRecords: null,
  proofStatus: "idle",
  depositStatus: "none",
  withdrawStatus: "none",
  batchStatus: "none",
};
