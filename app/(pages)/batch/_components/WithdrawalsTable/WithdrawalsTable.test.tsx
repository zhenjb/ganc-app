// =============================================================================
// Batch Screen (FE-06) — WithdrawalsTable modal / copy unit tests
// -----------------------------------------------------------------------------
// Covers the interactive reveal/copy behaviour of the WithdrawalsTable:
//   - Clicking the shortened destinationHash opens the HexRevealModal showing
//     the FULL destinationHash value (Req 6.6, 6.7).
//   - Copying inside the modal writes the FULL value to the clipboard and shows
//     a "Copied" confirmation that disappears within 3000ms (Req 6.8).
//   - Clicking the shortened nullifier opens the modal showing the FULL
//     nullifier value (Req 6.7).
//
// Uses Vitest fake timers with fireEvent (synchronous) to avoid deadlocks
// between user-event's internal delays and the fake clock.
//
// Requirements: 6.6, 6.7, 6.8
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import { WithdrawalsTable } from "@/app/(pages)/batch/_components/WithdrawalsTable/WithdrawalsTable";

// Mirror of the component-internal copy confirmation lifetime (Req 6.8).
const COPY_CONFIRM_MS = 3000;

// Full hex values long enough to be shortened in the cell yet revealed in full
// inside the modal. They are intentionally distinct so a test can never pass by
// matching the wrong field.
const FULL_DESTINATION_HASH =
  "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
const FULL_NULLIFIER =
  "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba";

/** A single WithdrawRecord fixture with known full destinationHash + nullifier. */
const WITHDRAWAL: WithdrawRecord = {
  id: "w-1",
  destination: "cosmos1destination00000000000000000000000",
  destinationHash: FULL_DESTINATION_HASH,
  amount: "1000000",
  denom: "uatom",
  nullifier: FULL_NULLIFIER,
  status: "pending",
  createdAt: "2024-01-01T00:00:00.000Z",
  claimedAt: null,
};

/** Install a resolved clipboard mock and return its `writeText` spy. */
function mockClipboard(): ReturnType<typeof vi.fn> {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  return writeText;
}

describe("WithdrawalsTable — reveal modal & copy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockClipboard();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens the modal revealing the full destinationHash when its cell is clicked", () => {
    render(<WithdrawalsTable withdrawals={[WITHDRAWAL]} />);

    // The modal is closed initially.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // The destinationHash cell button carries the full value in its title.
    fireEvent.click(screen.getByTitle(FULL_DESTINATION_HASH));

    const dialog = screen.getByRole("dialog");
    // The modal is labelled for the destination hash and reveals the full value.
    expect(dialog).toHaveAccessibleName("Destination hash");
    expect(within(dialog).getByText(FULL_DESTINATION_HASH)).toBeInTheDocument();
  });

  it("copies the full destinationHash and clears the confirmation after 3000ms", async () => {
    const writeText = mockClipboard();

    render(<WithdrawalsTable withdrawals={[WITHDRAWAL]} />);

    // Open the modal by clicking the destinationHash cell.
    fireEvent.click(screen.getByTitle(FULL_DESTINATION_HASH));
    const dialog = screen.getByRole("dialog");

    // Click Copy and flush the clipboard write promise.
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Copy" }));
      await Promise.resolve();
    });

    // The FULL value (not the shortened text) is written to the clipboard.
    expect(writeText).toHaveBeenCalledWith(FULL_DESTINATION_HASH);
    expect(screen.getByText("Copied")).toBeInTheDocument();

    // After the confirmation lifetime elapses, the message disappears.
    act(() => {
      vi.advanceTimersByTime(COPY_CONFIRM_MS);
    });
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });

  it("opens the modal revealing the full nullifier when its cell is clicked", () => {
    render(<WithdrawalsTable withdrawals={[WITHDRAWAL]} />);

    // Click the nullifier cell button.
    fireEvent.click(screen.getByTitle(FULL_NULLIFIER));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Nullifier");
    expect(within(dialog).getByText(FULL_NULLIFIER)).toBeInTheDocument();
  });
});
