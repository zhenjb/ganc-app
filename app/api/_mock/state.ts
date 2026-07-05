import type { AppState } from "@/app/lib/interfaces/state";

export const mockState: AppState = {
  mode: "local",
  currentStateRoot: "0xrootONCHAIN111782629532",
  userBalances: {
    "cosmos1ey2le3wmmnkwhkhhjugpklpawvfurvmujjycga/USDT": "99999900",
  },
  moduleAccountBalance: {
    USDT: "100",
  },
  latestDeposit: {
    id: "dep-cosmos1ey2le3wmmnkwhkhhjugpklpawvfurvmujjycga-100-9edac862",
    depositor: "cosmos1ey2le3wmmnkwhkhhjugpklpawvfurvmujjycga",
    denom: "USDT",
    amount: "100",
    txHash: "0x6f9b6f1e10acdf78f5563eb8376906036307846f588317c4594e2d9d67c55ca8",
    createdAt: "2026-06-28T06:00:00Z",
  },
  latestWithdrawRequest: {
    id: "wd-onchain11-1782629532",
    destination: "cosmos1ey2le3wmmnkwhkhhjugpklpawvfurvmujjycga",
    destinationHash: "0xmocknullifierONCHAIN111782629532",
    amount: "40",
    denom: "USDT",
    nullifier: "0xmocknullifierONCHAIN111782629532",
    status: "processed",
    createdAt: "2026-06-28T06:30:00Z",
  },
  latestSettlement: {
    oldStateRoot: "0xrootA",
    newStateRoot: "0xrootONCHAIN111782629532",
    depositsRoot: "0xdepositsRoot",
    withdrawalsRoot: "0xwithdrawalsRoot",
    nullifiersRoot: "0xnullifiersRoot",
    withdrawOutputsRoot: "0xwithdrawOutputsRoot",
  },
  latestBatchCommitments: null,
  latestProof: null,
  latestWithdrawRecords: {
    id: "wd-onchain11-1782629532",
    destination: "cosmos1ey2le3wmmnkwhkhhjugpklpawvfurvmujjycga",
    destinationHash: "0xmocknullifierONCHAIN111782629532",
    amount: "40",
    denom: "USDT",
    nullifier: "0xmocknullifierONCHAIN111782629532",
    status: "processed",
    createdAt: "2026-06-28T06:30:00Z",
  },
  proofStatus: "generated",
  depositStatus: "processed",
  withdrawStatus: "processed",
  batchStatus: "settled",
};
