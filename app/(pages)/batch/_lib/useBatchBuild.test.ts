import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useBatchBuild } from "@/app/(pages)/batch/_lib/useBatchBuild";
import { postBatchBuild } from "@/app/lib/services/api";
import { ApiError } from "@/app/lib/interfaces/api";
import type {
  BatchBuildInput,
  BatchBuildResponse,
} from "@/app/lib/interfaces/batch";

// The hook reaches the backend only through the typed `postBatchBuild` wrapper
// (Req 3.6). Mock the whole api module so no real `fetch` is issued and we can
// drive success / failure / in-flight scenarios deterministically.
vi.mock("@/app/lib/services/api", () => ({
  postBatchBuild: vi.fn(),
}));

const mockedPostBatchBuild = vi.mocked(postBatchBuild);

/** A minimal, well-formed payload — its exact contents are irrelevant here. */
const PAYLOAD: BatchBuildInput = {
  pendingDepositIds: ["d1"],
  pendingWithdrawIds: ["w1"],
};

/** A representative successful build response. */
const RESPONSE: BatchBuildResponse = {
  commitments: {
    publicInputs: {
      oldStateRoot: "0xold",
      newStateRoot: "0xnew",
      depositsRoot: "0xdep",
      withdrawalsRoot: "0xwit",
      nullifiersRoot: "0xnul",
      withdrawOutputsRoot: "0xout",
    },
    batchHash: "0xhash",
  },
  witness: {
    inputs: ["0xabc"],
    auxiliary: { secretSalt: "0x01" },
  },
};

/** A manually-controlled promise so a test can decide when a build settles. */
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
  mockedPostBatchBuild.mockReset();
});

describe("useBatchBuild", () => {
  it("calls postBatchBuild exactly once and sets result on success (Req 3.1, 3.4)", async () => {
    mockedPostBatchBuild.mockResolvedValue(RESPONSE);
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useBatchBuild({ refresh }));

    await act(async () => {
      await result.current.build(PAYLOAD);
    });

    expect(mockedPostBatchBuild).toHaveBeenCalledTimes(1);
    expect(mockedPostBatchBuild).toHaveBeenCalledWith(PAYLOAD);
    expect(result.current.result).toEqual(RESPONSE);
    // The spinner is cleared once the build settles successfully (Req 3.4).
    expect(result.current.building).toBe(false);
    expect(result.current.buildError).toBe(false);
  });

  it("ignores a second build while one is in flight (single-in-flight guard, Req 3.3)", async () => {
    const pending = deferred<BatchBuildResponse>();
    mockedPostBatchBuild.mockReturnValue(pending.promise);
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useBatchBuild({ refresh }));

    let firstBuild!: Promise<void>;
    await act(async () => {
      // First call starts the request and suspends on the pending promise.
      firstBuild = result.current.build(PAYLOAD);
      // Second call must hit the synchronous in-flight guard and return early.
      await result.current.build(PAYLOAD);
    });

    expect(mockedPostBatchBuild).toHaveBeenCalledTimes(1);
    expect(result.current.building).toBe(true);

    // Let the original build finish and flush the post-render refresh.
    await act(async () => {
      pending.resolve(RESPONSE);
      await firstBuild;
    });

    expect(mockedPostBatchBuild).toHaveBeenCalledTimes(1);
    expect(result.current.building).toBe(false);
    expect(result.current.result).toEqual(RESPONSE);
  });

  it("calls refresh exactly once after a successful build (Req 11.1)", async () => {
    mockedPostBatchBuild.mockResolvedValue(RESPONSE);
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useBatchBuild({ refresh }));

    await act(async () => {
      await result.current.build(PAYLOAD);
    });

    // refresh fires from a post-render effect, so wait for it to settle.
    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });
    // The result is committed before / independent of the refresh (Req 11.1).
    expect(result.current.result).toEqual(RESPONSE);
  });

  it("invokes onSuccess with the response on success (session handoff)", async () => {
    mockedPostBatchBuild.mockResolvedValue(RESPONSE);
    const refresh = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useBatchBuild({ refresh, onSuccess }),
    );

    await act(async () => {
      await result.current.build(PAYLOAD);
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(RESPONSE);
  });

  it("retains the result and keeps buildError false when refresh rejects (Req 11.3)", async () => {
    mockedPostBatchBuild.mockResolvedValue(RESPONSE);
    const refresh = vi.fn().mockRejectedValue(new Error("refresh failed"));

    const { result } = renderHook(() => useBatchBuild({ refresh }));

    await act(async () => {
      await result.current.build(PAYLOAD);
    });

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });

    // A failing refresh must not clear the already-displayed result, and the
    // build itself still counts as a success (Req 11.3).
    expect(result.current.result).toEqual(RESPONSE);
    expect(result.current.buildError).toBe(false);
    expect(result.current.building).toBe(false);
  });

  it("on ApiError failure: building false, buildError true, no result, no refresh (Req 3.5, 11.4, 12.7)", async () => {
    mockedPostBatchBuild.mockRejectedValue(
      new ApiError("Internal Server Error", 500),
    );
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useBatchBuild({ refresh }));

    await act(async () => {
      await result.current.build(PAYLOAD);
    });

    expect(result.current.building).toBe(false); // Req 3.5
    expect(result.current.buildError).toBe(true);
    expect(result.current.result).toBeNull(); // Req 12.7
    expect(refresh).not.toHaveBeenCalled(); // Req 11.4
  });

  it("clearError() hides the error banner", async () => {
    mockedPostBatchBuild.mockRejectedValue(
      new ApiError("Internal Server Error", 500),
    );
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useBatchBuild({ refresh }));

    await act(async () => {
      await result.current.build(PAYLOAD);
    });
    expect(result.current.buildError).toBe(true);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.buildError).toBe(false);
  });

  it("clears the previous error before issuing a new build (Req 12.6)", async () => {
    // First build fails and raises the error banner.
    mockedPostBatchBuild.mockRejectedValueOnce(
      new ApiError("Internal Server Error", 500),
    );
    const refresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useBatchBuild({ refresh }));

    await act(async () => {
      await result.current.build(PAYLOAD);
    });
    expect(result.current.buildError).toBe(true);

    // A subsequent build clears the prior error before the new request runs.
    mockedPostBatchBuild.mockResolvedValueOnce(RESPONSE);
    await act(async () => {
      await result.current.build(PAYLOAD);
    });

    expect(result.current.buildError).toBe(false);
    expect(result.current.result).toEqual(RESPONSE);
  });
});
