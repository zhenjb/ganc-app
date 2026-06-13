import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProofGenerate } from "@/app/(pages)/proof/_lib/useProofGenerate";
import { postProofGenerate } from "@/app/lib/services/api";
import { ApiError } from "@/app/lib/interfaces/api";
import type {
  ProofBundle,
  ProofGenerateInput,
  ProofGenerateResponse,
} from "@/app/lib/interfaces/proof";

// Mock the API layer — no real fetch calls during unit tests.
vi.mock("@/app/lib/services/api", () => ({
  postProofGenerate: vi.fn(),
}));

// Mock createProofTimeout so tests don't rely on real timers.
vi.mock("./proofTimeout", () => ({
  createProofTimeout: vi.fn(() => ({
    signal: new AbortController().signal,
    clear: vi.fn(),
  })),
}));

const mockedPostProofGenerate = vi.mocked(postProofGenerate);

/** Minimal valid input payload. */
const INPUT: ProofGenerateInput = {
  settlementUpdate: {
    batchId: "batch-1",
    oldStateRoot: "0xold",
    newStateRoot: "0xnew",
    deposits: [],
    withdrawals: [],
  },
  batchCommitments: {
    depositsRoot: "0xdep",
    withdrawalsRoot: "0xwit",
    nullifiersRoot: "0xnul",
    withdrawOutputsRoot: "0xout",
  },
  witness: { accounts: [] },
};

/** A well-formed ProofBundle with a valid proof and 6 public inputs. */
const VALID_BUNDLE: ProofBundle = {
  proof: "0xabcdef1234567890abcdef1234567890",
  publicInputs: ["0x01", "0x02", "0x03", "0x04", "0x05", "0x06"],
  verificationKeyId: "local-v1",
};

/** A successful API response. */
const SUCCESS_RESPONSE: ProofGenerateResponse = {
  proofBundle: VALID_BUNDLE,
  state: { proofStatus: "ready" },
};

/** A manually-controlled promise for deterministic test control. */
function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  mockedPostProofGenerate.mockReset();
});

describe("useProofGenerate", () => {
  it("initial state: proofStatus=idle, proofBundle=null, error=false, timedOut=false (Req 2.2)", () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useProofGenerate({ refresh }));

    expect(result.current.proofStatus).toBe("idle");
    expect(result.current.proofBundle).toBeNull();
    expect(result.current.error).toBe(false);
    expect(result.current.timedOut).toBe(false);
    expect(result.current.invalidInputs).toBe(false);
  });

  it("success flow: idle → generating → ready, stores bundle, calls refresh (Req 2.2, 2.3)", async () => {
    mockedPostProofGenerate.mockResolvedValue(SUCCESS_RESPONSE);
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useProofGenerate({ refresh }));

    await act(async () => {
      await result.current.generate(INPUT);
    });

    expect(result.current.proofStatus).toBe("ready");
    expect(result.current.proofBundle).toEqual(VALID_BUNDLE);
    expect(result.current.error).toBe(false);
    expect(result.current.timedOut).toBe(false);

    // refresh is called after success.
    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it("sets proofStatus to 'generating' during the API call (Req 2.2)", async () => {
    const pending = deferred<ProofGenerateResponse>();
    mockedPostProofGenerate.mockReturnValue(pending.promise);
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useProofGenerate({ refresh }));

    act(() => {
      // Fire generate but don't await — leaves it in "generating" state.
      void result.current.generate(INPUT);
    });

    // Status should be "generating" while the request is in-flight.
    await waitFor(() => {
      expect(result.current.proofStatus).toBe("generating");
    });

    // Resolve the pending request.
    await act(async () => {
      pending.resolve(SUCCESS_RESPONSE);
    });

    expect(result.current.proofStatus).toBe("ready");
  });

  it("error flow: API throws non-abort ApiError → idle, error=true, timedOut=false (Req 2.4, 5.1)", async () => {
    mockedPostProofGenerate.mockRejectedValue(
      new ApiError("Internal Server Error", 500),
    );
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useProofGenerate({ refresh }));

    await act(async () => {
      await result.current.generate(INPUT);
    });

    expect(result.current.proofStatus).toBe("idle");
    expect(result.current.error).toBe(true);
    expect(result.current.timedOut).toBe(false);
    expect(result.current.proofBundle).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("timeout flow: API throws aborted ApiError → idle, error=true, timedOut=true (Req 4.4)", async () => {
    mockedPostProofGenerate.mockRejectedValue(
      new ApiError("Request timed out", 0, true),
    );
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useProofGenerate({ refresh }));

    await act(async () => {
      await result.current.generate(INPUT);
    });

    expect(result.current.proofStatus).toBe("idle");
    expect(result.current.error).toBe(true);
    expect(result.current.timedOut).toBe(true);
    expect(result.current.proofBundle).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("double-submit guard: second generate() during in-flight is a no-op (Req 2.5)", async () => {
    const pending = deferred<ProofGenerateResponse>();
    mockedPostProofGenerate.mockReturnValue(pending.promise);
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useProofGenerate({ refresh }));

    let firstGenerate!: Promise<void>;
    await act(async () => {
      firstGenerate = result.current.generate(INPUT);
      // Second call while first is in-flight — should be ignored.
      await result.current.generate(INPUT);
    });

    // Only one API call should have been made.
    expect(mockedPostProofGenerate).toHaveBeenCalledTimes(1);

    // Resolve and finish.
    await act(async () => {
      pending.resolve(SUCCESS_RESPONSE);
      await firstGenerate;
    });

    expect(result.current.proofStatus).toBe("ready");
  });

  it("empty proof: API returns proof='' → error=true, proofBundle stays null (Req 2.6)", async () => {
    const emptyProofResponse: ProofGenerateResponse = {
      proofBundle: {
        proof: "" as `0x${string}`,
        publicInputs: ["0x01", "0x02", "0x03", "0x04", "0x05", "0x06"],
        verificationKeyId: "local-v1",
      },
      state: { proofStatus: "ready" },
    };
    mockedPostProofGenerate.mockResolvedValue(emptyProofResponse);
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useProofGenerate({ refresh }));

    await act(async () => {
      await result.current.generate(INPUT);
    });

    expect(result.current.proofStatus).toBe("idle");
    expect(result.current.error).toBe(true);
    expect(result.current.proofBundle).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("empty proof '0x': API returns proof='0x' → error=true, proofBundle stays null (Req 2.6)", async () => {
    const emptyProofResponse: ProofGenerateResponse = {
      proofBundle: {
        proof: "0x",
        publicInputs: ["0x01", "0x02", "0x03", "0x04", "0x05", "0x06"],
        verificationKeyId: "local-v1",
      },
      state: { proofStatus: "ready" },
    };
    mockedPostProofGenerate.mockResolvedValue(emptyProofResponse);
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useProofGenerate({ refresh }));

    await act(async () => {
      await result.current.generate(INPUT);
    });

    expect(result.current.proofStatus).toBe("idle");
    expect(result.current.error).toBe(true);
    expect(result.current.proofBundle).toBeNull();
  });

  it("clearError: resets error and timedOut to false", async () => {
    mockedPostProofGenerate.mockRejectedValue(
      new ApiError("Request timed out", 0, true),
    );
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useProofGenerate({ refresh }));

    await act(async () => {
      await result.current.generate(INPUT);
    });

    expect(result.current.error).toBe(true);
    expect(result.current.timedOut).toBe(true);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(false);
    expect(result.current.timedOut).toBe(false);
  });

  it("failure preserves existing proofBundle — does not overwrite (Req 5.3)", async () => {
    // First, generate a successful proof so proofBundle is set.
    mockedPostProofGenerate.mockResolvedValueOnce(SUCCESS_RESPONSE);
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useProofGenerate({ refresh }));

    await act(async () => {
      await result.current.generate(INPUT);
    });
    expect(result.current.proofBundle).toEqual(VALID_BUNDLE);

    // Now a subsequent generate fails — proofBundle should be unchanged.
    mockedPostProofGenerate.mockRejectedValueOnce(
      new ApiError("Internal Server Error", 500),
    );

    await act(async () => {
      await result.current.generate(INPUT);
    });

    expect(result.current.proofStatus).toBe("idle");
    expect(result.current.error).toBe(true);
    // The existing proofBundle is preserved!
    expect(result.current.proofBundle).toEqual(VALID_BUNDLE);
  });

  it("calls onSuccess callback with response on success", async () => {
    mockedPostProofGenerate.mockResolvedValue(SUCCESS_RESPONSE);
    const refresh = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useProofGenerate({ refresh, onSuccess }),
    );

    await act(async () => {
      await result.current.generate(INPUT);
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(SUCCESS_RESPONSE);
  });

  it("resets error state before starting a new generate (Req 5.5)", async () => {
    // First call fails.
    mockedPostProofGenerate.mockRejectedValueOnce(
      new ApiError("Internal Server Error", 500),
    );
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useProofGenerate({ refresh }));

    await act(async () => {
      await result.current.generate(INPUT);
    });
    expect(result.current.error).toBe(true);

    // Second call should clear error before starting the request.
    mockedPostProofGenerate.mockResolvedValueOnce(SUCCESS_RESPONSE);
    await act(async () => {
      await result.current.generate(INPUT);
    });

    expect(result.current.error).toBe(false);
    expect(result.current.proofStatus).toBe("ready");
  });

  it("unmount cleanup: clear function is called on unmount (Req 4.6)", async () => {
    // Import the mocked module to check if clear() is called on unmount.
    const { createProofTimeout } = await import("./proofTimeout");
    const mockedCreateProofTimeout = vi.mocked(createProofTimeout);
    const clearFn = vi.fn();
    mockedCreateProofTimeout.mockReturnValue({
      signal: new AbortController().signal,
      clear: clearFn,
    });

    const pending = deferred<ProofGenerateResponse>();
    mockedPostProofGenerate.mockReturnValue(pending.promise);
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result, unmount } = renderHook(() =>
      useProofGenerate({ refresh }),
    );

    // Start a generate but don't resolve it.
    act(() => {
      void result.current.generate(INPUT);
    });

    await waitFor(() => {
      expect(result.current.proofStatus).toBe("generating");
    });

    // Unmount while request is still in-flight.
    unmount();

    // The clear function should have been invoked via the cleanup effect.
    expect(clearFn).toHaveBeenCalled();
  });

  it("invalidInputs: publicInputs.length !== 6 → sets warning, still stores bundle (Req 3.5)", async () => {
    const invalidInputsResponse: ProofGenerateResponse = {
      proofBundle: {
        proof: "0xabcdef1234567890abcdef1234567890",
        // Only 4 public inputs instead of required 6.
        publicInputs: ["0x01", "0x02", "0x03", "0x04"] as unknown as [
          `0x${string}`,
          `0x${string}`,
          `0x${string}`,
          `0x${string}`,
          `0x${string}`,
          `0x${string}`,
        ],
        verificationKeyId: "local-v1",
      },
      state: { proofStatus: "ready" },
    };
    mockedPostProofGenerate.mockResolvedValue(invalidInputsResponse);
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useProofGenerate({ refresh }));

    await act(async () => {
      await result.current.generate(INPUT);
    });

    // Bundle is still stored despite invalid inputs (Req 3.5).
    expect(result.current.proofStatus).toBe("ready");
    expect(result.current.invalidInputs).toBe(true);
    expect(result.current.proofBundle).toEqual(invalidInputsResponse.proofBundle);
    expect(result.current.error).toBe(false);
  });
});
