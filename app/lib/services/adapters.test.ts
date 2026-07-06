import { describe, it, expect } from "vitest";
import {
  normalizeDeposit,
  normalizeWithdraw,
  normalizeState,
} from "@/app/lib/services/adapters";

describe("normalizeDeposit", () => {
  it("maps the REAL backend shape (depositId/owner) to FE fields", () => {
    const d = normalizeDeposit({
      depositId: "dep-cosmos1abc-100-2b1e",
      owner: "cosmos1abc",
      denom: "USDT",
      amount: "100",
      txHash: "DC8367A7",
      processed: false,
      createdHeight: 100,
    });
    expect(d.id).toBe("dep-cosmos1abc-100-2b1e");
    expect(d.depositor).toBe("cosmos1abc");
    expect(d.amount).toBe("100");
    expect(d.denom).toBe("USDT");
    expect(d.txHash).toBe("DC8367A7");
  });

  it("passes through the MOCK shape (id/depositor) unchanged", () => {
    const d = normalizeDeposit({
      id: "mock-1",
      depositor: "cosmos1xyz",
      denom: "USDT",
      amount: "40",
      txHash: "0xabc",
      createdAt: "2026-06-28T06:00:00Z",
    });
    expect(d.id).toBe("mock-1");
    expect(d.depositor).toBe("cosmos1xyz");
    expect(d.createdAt).toBe("2026-06-28T06:00:00Z");
  });

  it("never yields undefined fields (guards .slice()/.amount crashes)", () => {
    const d = normalizeDeposit({});
    expect(d.id).toBe("");
    expect(d.depositor).toBe("");
    expect(d.amount).toBe("");
    expect(typeof d.depositor).toBe("string");
  });
});

describe("normalizeWithdraw", () => {
  it("maps the REAL backend record (withdrawId/owner/claimed=false)", () => {
    const w = normalizeWithdraw({
      withdrawId: "wd-1",
      owner: "cosmos1abc",
      destination: "cosmos1abc",
      denom: "USDT",
      amount: "40",
      nullifier: "0xnull",
      claimed: false,
    });
    expect(w.id).toBe("wd-1");
    expect(w.destination).toBe("cosmos1abc");
    expect(w.nullifier).toBe("0xnull");
    expect(w.status).toBe("processed");
  });

  it("derives status=claimed from the real `claimed` flag", () => {
    const w = normalizeWithdraw({ withdrawId: "wd-2", claimed: true });
    expect(w.status).toBe("claimed");
  });

  it("prefers an explicit mock `status` when present", () => {
    const w = normalizeWithdraw({ id: "wd-3", status: "pending" });
    expect(w.id).toBe("wd-3");
    expect(w.status).toBe("pending");
  });

  it("defaults status to pending when neither status nor claimed exist", () => {
    expect(normalizeWithdraw({ withdrawId: "wd-4" }).status).toBe("pending");
  });
});

describe("normalizeState", () => {
  it("forces null maps to {} so Object.entries never throws", () => {
    const s = normalizeState({ mode: "local", userBalances: null });
    expect(s.userBalances).toEqual({});
    expect(s.moduleAccountBalance).toEqual({});
    expect(() => Object.entries(s.userBalances)).not.toThrow();
  });

  it("normalizes a nested REAL latestDeposit (owner -> depositor)", () => {
    const s = normalizeState({
      mode: "local",
      userBalances: { "cosmos1abc/USDT": "940" },
      moduleAccountBalance: { USDT: "60" },
      latestDeposit: {
        depositId: "dep-1",
        owner: "cosmos1abc",
        denom: "USDT",
        amount: "60",
        txHash: "0xtx",
      },
    });
    expect(s.latestDeposit?.depositor).toBe("cosmos1abc");
    expect(s.latestDeposit?.id).toBe("dep-1");
  });

  it("keeps latest* null when absent and defaults statuses", () => {
    const s = normalizeState({ mode: "local" });
    expect(s.latestDeposit).toBeNull();
    expect(s.latestWithdrawRequest).toBeNull();
    expect(s.depositStatus).toBe("none");
    expect(s.proofStatus).toBe("idle");
  });

  it("builds latestBatchCommitments.publicInputs from the REAL split shape", () => {
    // Real backend: 4 roots FLAT on batchCommitments; old/new on settlement.
    const s = normalizeState({
      mode: "local",
      latestSettlement: {
        batchId: "batch-1",
        oldStateRoot: "0xrootA",
        newStateRoot: "0xnew",
        deposits: [],
        withdrawals: [],
      },
      latestBatchCommitments: {
        depositsRoot: "0xdep",
        withdrawalsRoot: "0xwd",
        nullifiersRoot: "0xnull",
        withdrawOutputsRoot: "0xout",
      },
    });
    const pi = s.latestBatchCommitments?.publicInputs;
    expect(pi).toBeDefined();
    expect(pi?.oldStateRoot).toBe("0xrootA");
    expect(pi?.newStateRoot).toBe("0xnew");
    expect(pi?.depositsRoot).toBe("0xdep");
    expect(pi?.withdrawOutputsRoot).toBe("0xout");
  });

  it("passes through the MOCK nested publicInputs shape", () => {
    const s = normalizeState({
      mode: "local",
      latestBatchCommitments: {
        publicInputs: {
          oldStateRoot: "0xA",
          newStateRoot: "0xB",
          depositsRoot: "0xC",
          withdrawalsRoot: "0xD",
          nullifiersRoot: "0xE",
          withdrawOutputsRoot: "0xF",
        },
        batchHash: "0xhash",
      },
    });
    expect(s.latestBatchCommitments?.publicInputs.oldStateRoot).toBe("0xA");
    expect(s.latestBatchCommitments?.batchHash).toBe("0xhash");
  });

  it("keeps latestBatchCommitments null when absent", () => {
    expect(normalizeState({ mode: "local" }).latestBatchCommitments).toBeNull();
  });

  it("normalizes an array latestWithdrawRecords", () => {
    const s = normalizeState({
      mode: "local",
      latestWithdrawRecords: [
        { withdrawId: "wd-1", destination: "cosmos1abc", claimed: true },
      ],
    });
    const recs = s.latestWithdrawRecords;
    expect(Array.isArray(recs)).toBe(true);
    expect((recs as { id: string }[])[0].id).toBe("wd-1");
  });
});
