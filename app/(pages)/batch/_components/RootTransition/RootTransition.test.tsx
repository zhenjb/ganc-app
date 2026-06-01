// =============================================================================
// FE-06 Batch Screen — RootTransition unit tests
// -----------------------------------------------------------------------------
// Covers the interactive behaviour of the root-transition visual:
//   - both roots render shortened, full hex exposed via the `title` attribute
//     (hover affordance) — Req 5.3
//   - clicking a root opens the HexRevealModal with the full value — Req 5.4
//   - the modal Copy button writes to the clipboard and shows a "Copied"
//     confirmation that disappears after 2000ms — Req 5.5
//   - pressing Escape closes the modal — Req 5.6
//   - a missing/"0x" root is flagged with a non-color text/aria indicator —
//     Req 5.8
//
// Note on tooling: `@testing-library/user-event` is not a project dependency,
// so interactions use `fireEvent` from `@testing-library/react`. fireEvent is
// synchronous, which also keeps the fake-timer copy assertions deterministic.
// =============================================================================

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";

import { RootTransition } from "@/app/(pages)/batch/_components/RootTransition/RootTransition";
import type { SettlementUpdate } from "@/app/lib/interfaces/batch";
import { shortenHex } from "@/app/lib/services/format";

// Two distinct, full-length (32-byte) hex roots used as the "present" values.
const FULL_OLD_ROOT =
  "0x1111111111111111111111111111111111111111111111111111111111111111";
const FULL_NEW_ROOT =
  "0x2222222222222222222222222222222222222222222222222222222222222222";

/** Build a complete SettlementUpdate fixture, overriding only what a test needs. */
function makeSettlementUpdate(
  overrides: Partial<SettlementUpdate> = {},
): SettlementUpdate {
  return {
    oldStateRoot: FULL_OLD_ROOT,
    newStateRoot: FULL_NEW_ROOT,
    depositsRoot:
      "0x3333333333333333333333333333333333333333333333333333333333333333",
    withdrawalsRoot:
      "0x4444444444444444444444444444444444444444444444444444444444444444",
    nullifiersRoot:
      "0x5555555555555555555555555555555555555555555555555555555555555555",
    withdrawOutputsRoot:
      "0x6666666666666666666666666666666666666666666666666666666666666666",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("RootTransition", () => {
  it("renders both roots shortened and exposes the full hex via the title attribute (Req 5.3)", () => {
    render(<RootTransition publicInputs={makeSettlementUpdate()} />);

    const oldButton = screen.getByRole("button", { name: /^Old state root/ });
    const newButton = screen.getByRole("button", { name: /^New state root/ });

    // Shortened labels are visible to the user.
    expect(
      within(oldButton).getByText(shortenHex(FULL_OLD_ROOT, 6, 4)),
    ).toBeInTheDocument();
    expect(
      within(newButton).getByText(shortenHex(FULL_NEW_ROOT, 6, 4)),
    ).toBeInTheDocument();

    // Hover affordance: the full, un-shortened value is carried by `title`.
    expect(oldButton).toHaveAttribute("title", FULL_OLD_ROOT);
    expect(newButton).toHaveAttribute("title", FULL_NEW_ROOT);
  });

  it("opens the HexRevealModal showing the full hex value when a root is clicked (Req 5.4)", () => {
    render(<RootTransition publicInputs={makeSettlementUpdate()} />);

    // No dialog before interaction.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Old state root/ }));

    const dialog = screen.getByRole("dialog", { name: "Old state root" });
    // The modal reveals the complete value, not the shortened form.
    expect(within(dialog).getByText(FULL_OLD_ROOT)).toBeInTheDocument();
  });

  it("shows the 'Copied' confirmation on copy and hides it after 2000ms (Req 5.5)", async () => {
    vi.useFakeTimers();

    // Mock the async Clipboard API used by HexRevealModal.handleCopy.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<RootTransition publicInputs={makeSettlementUpdate()} />);

    fireEvent.click(screen.getByRole("button", { name: /^New state root/ }));

    // Click Copy and flush the clipboard promise's microtask within act().
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });

    expect(writeText).toHaveBeenCalledWith(FULL_NEW_ROOT);
    expect(screen.getByText("Copied")).toBeInTheDocument();

    // Just before the deadline the confirmation is still present.
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(screen.getByText("Copied")).toBeInTheDocument();

    // At 2000ms the confirmation clears.
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });

  it("closes the modal when Escape is pressed (Req 5.6)", () => {
    render(<RootTransition publicInputs={makeSettlementUpdate()} />);

    fireEvent.click(screen.getByRole("button", { name: /^Old state root/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // useEscapeKey listens on document.
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("flags a missing root with a non-color text/aria indicator (Req 5.8)", () => {
    // One valid root, one missing ("0x" is treated as missing by isMissingRoot).
    render(
      <RootTransition
        publicInputs={makeSettlementUpdate({ newStateRoot: "0x" })}
      />,
    );

    // Text indicator so the missing state is not conveyed by color alone.
    expect(screen.getByText("Missing")).toBeInTheDocument();

    // Accessible name communicates the missing state to assistive tech.
    expect(
      screen.getByRole("button", { name: "New state root: missing value" }),
    ).toBeInTheDocument();

    // The present root is unaffected.
    expect(
      screen.getByRole("button", { name: `Old state root: ${FULL_OLD_ROOT}` }),
    ).toBeInTheDocument();
  });
});
