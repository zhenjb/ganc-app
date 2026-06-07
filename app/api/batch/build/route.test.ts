import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/batch/build/route";
import { mockState } from "@/app/api/_mock/state";
import type { BatchBuildResponse } from "@/app/lib/interfaces/batch";

/**
 * Integration test for POST /api/batch/build → mockState mutation.
 *
 * Validates: Requirements 11.2, 13.7
 *
 * A valid POST must mutate the shared in-memory `mockState` so that
 * `batchStatus === "pending"`, `proofStatus === "idle"`, and
 * `latestBatchCommitments` deep-equals the `commitments` object returned in
 * the same BatchBuildResponse (Req 13.7). This is the backing state that
 * `refresh()` / GET /api/state surfaces to the UI (Req 11.2).
 *
 * Note: NODE_ENV is "test" under Vitest, so the production 404 guard in the
 * route is not triggered here.
 */

/** Build a valid POST Request with a JSON BatchBuildInput body. */
function buildValidRequest(): Request {
  return new Request("http://localhost/api/batch/build", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      pendingDepositIds: ["d1"],
      pendingWithdrawIds: ["w1"],
    }),
  });
}

describe("POST /api/batch/build — mockState mutation", () => {
  it("mutates mockState on a valid request and matches the response commitments", async () => {
    const response = await POST(buildValidRequest());

    // The mock route handler must accept the valid input.
    expect(response.status).toBe(200);

    const body = (await response.json()) as BatchBuildResponse;

    // After a successful build, the shared mock state reflects the new
    // batch lifecycle (Req 11.2, 13.7).
    expect(mockState.batchStatus).toBe("pending");
    expect(mockState.proofStatus).toBe("idle");

    // latestBatchCommitments deep-equals the commitments from the same response.
    expect(mockState.latestBatchCommitments).toEqual(body.commitments);
  });
});
