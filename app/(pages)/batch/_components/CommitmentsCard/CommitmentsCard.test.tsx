// =============================================================================
// FE-06 Batch Screen — CommitmentsCard example-based tests
// -----------------------------------------------------------------------------
// Covers the user-facing behavior of the 4 commitment-root blocks plus the
// batch hash:
//   - 4 distinct English explanation badges (Req 7.3)
//   - batchHash shortened with full hex available on hover via `title` (Req 7.8)
//   - clicking a present root opens the reveal modal, and Copy writes the full
//     value to the clipboard + shows an English confirmation (Req 7.9)
//   - a missing root surfaces an English text indicator, not color alone
//     (Req 7.10)
//
// Uses `fireEvent` (the shipped @testing-library/react API) rather than
// user-event, which is not a project dependency.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { CommitmentsCard } from "@/app/(pages)/batch/_components/CommitmentsCard/CommitmentsCard";
import { COMMITMENT_ROOT_EXPLANATIONS } from "@/app/constants/commitments";
import type { BatchCommitments } from "@/app/lib/interfaces/batch";

// --- Fixtures ---------------------------------------------------------------

/** Build a valid 0x-prefixed 32-byte (64 hex char) root from a single char. */
const root = (fill: string): string => `0x${fill.repeat(64)}`;

/** A fully populated commitments object: 6 distinct valid roots + batchHash. */
const fullCommitments: BatchCommitments = {
  publicInputs: {
    oldStateRoot: root("1"),
    newStateRoot: root("2"),
    depositsRoot: root("a"),
    withdrawalsRoot: root("b"),
    nullifiersRoot: root("c"),
    withdrawOutputsRoot: root("d"),
  },
  batchHash: root("e"),
};

// --- Clipboard mock ---------------------------------------------------------

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  // jsdom does not implement the clipboard API; install a controllable mock.
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------

describe("CommitmentsCard", () => {
  it("renders 4 distinct English explanation badges (Req 7.3)", () => {
    render(<CommitmentsCard commitments={fullCommitments} />);

    const descriptions = [
      COMMITMENT_ROOT_EXPLANATIONS.depositsRoot.description,
      COMMITMENT_ROOT_EXPLANATIONS.withdrawalsRoot.description,
      COMMITMENT_ROOT_EXPLANATIONS.nullifiersRoot.description,
      COMMITMENT_ROOT_EXPLANATIONS.withdrawOutputsRoot.description,
    ];

    // Each explanation badge is rendered...
    for (const description of descriptions) {
      expect(screen.getByText(description)).toBeInTheDocument();
    }

    // ...and the four badges are pairwise different (no two share text).
    expect(new Set(descriptions).size).toBe(4);
  });

  it("shortens batchHash and exposes the full hex on hover via title (Req 7.8)", () => {
    render(<CommitmentsCard commitments={fullCommitments} />);

    // The full hex lives in the `title` attribute (the hover affordance).
    const batchHashEl = screen.getByTitle(fullCommitments.batchHash);

    // The visible text is the shortened form, not the full hex.
    expect(batchHashEl).toHaveAttribute("title", fullCommitments.batchHash);
    expect(batchHashEl).toHaveTextContent("0xeeeeee…eeee");
    expect(batchHashEl).not.toHaveTextContent(fullCommitments.batchHash);
  });

  it("opens the reveal modal and copies the full root value on Copy (Req 7.9)", async () => {
    render(<CommitmentsCard commitments={fullCommitments} />);

    const depositsRoot = fullCommitments.publicInputs.depositsRoot;

    // Clicking a present root opens the reveal modal showing the full hex.
    fireEvent.click(
      screen.getByRole("button", { name: "Reveal full Deposits Root" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Deposits Root" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(depositsRoot)).toBeInTheDocument();

    // Copy writes the full (un-shortened) value to the clipboard.
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(depositsRoot);

    // Flush the clipboard promise, then assert the English confirmation shows.
    const confirmation = await screen.findByText("Copied");
    expect(confirmation).toBeInTheDocument();
  });

  it("shows an English text indicator for a missing root, not color alone (Req 7.10)", () => {
    const withMissingRoot: BatchCommitments = {
      ...fullCommitments,
      publicInputs: {
        ...fullCommitments.publicInputs,
        nullifiersRoot: "0x",
      },
    };

    render(<CommitmentsCard commitments={withMissingRoot} />);

    // The missing root surfaces a readable English indicator...
    const indicator = screen.getByText("Missing — this root has no value.");
    expect(indicator).toBeInTheDocument();
    // ...exposed to assistive tech via role="status" (not color-only).
    expect(indicator).toHaveAttribute("role", "status");

    // The missing root no longer renders a reveal button.
    expect(
      screen.queryByRole("button", { name: "Reveal full Nullifiers Root" }),
    ).not.toBeInTheDocument();
  });
});
