// =============================================================================
// FE-06 Batch Screen — HexRevealModal unit tests
// -----------------------------------------------------------------------------
// Covers the copy + confirmation lifecycle (with fake timers) and the close
// affordances (Escape key + close button).
//
// Validates: Requirements 5.5, 5.6, 6.8, 7.9
// -----------------------------------------------------------------------------
// Note: `@testing-library/user-event` is not part of this project's pinned
// dependencies, so these tests drive interactions with `fireEvent` + `act`,
// which exercises the same DOM events the component listens to.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { HexRevealModal } from "@/app/(pages)/batch/_components/HexRevealModal/HexRevealModal";

// A full 0x-prefixed 64-hex-char value, longer than any shortened label.
const FULL_VALUE = "0x" + "a1b2c3d4".repeat(8);
const LABEL = "Deposits root";

/** Install a resolved clipboard mock and return its `writeText` spy. */
function mockClipboard(): ReturnType<typeof vi.fn> {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  return writeText;
}

describe("HexRevealModal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the full value and a Copy button when open", () => {
    mockClipboard();
    render(
      <HexRevealModal
        open
        value={FULL_VALUE}
        label={LABEL}
        copyConfirmMs={2000}
        onClose={vi.fn()}
      />,
    );

    // The dialog exposes the label as its accessible name.
    expect(screen.getByRole("dialog", { name: LABEL })).toBeInTheDocument();
    // The complete, un-shortened hex value is shown.
    expect(screen.getByText(FULL_VALUE)).toBeInTheDocument();
    // A Copy button is available.
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("renders nothing when open is false", () => {
    mockClipboard();
    const { container } = render(
      <HexRevealModal
        open={false}
        value={FULL_VALUE}
        label={LABEL}
        copyConfirmMs={2000}
        onClose={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("copies the full value and shows the confirmation, which disappears after copyConfirmMs (2000ms)", async () => {
    const writeText = mockClipboard();
    render(
      <HexRevealModal
        open
        value={FULL_VALUE}
        label={LABEL}
        copyConfirmMs={2000}
        onClose={vi.fn()}
      />,
    );

    // Click Copy and flush the clipboard write promise so the confirmation
    // state update is applied. (Req 5.5, 6.8, 7.9)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
      await Promise.resolve();
    });

    // The full value was written to the clipboard.
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(FULL_VALUE);

    // The "Copied" confirmation is announced via the live region.
    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("Copied");

    // Just before the deadline the confirmation is still visible.
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Copied");

    // After advancing the full copyConfirmMs the confirmation disappears.
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });

  it("keeps the confirmation visible until copyConfirmMs (3000ms) elapses", async () => {
    mockClipboard();
    render(
      <HexRevealModal
        open
        value={FULL_VALUE}
        label={LABEL}
        copyConfirmMs={3000}
        onClose={vi.fn()}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
      await Promise.resolve();
    });

    expect(screen.getByRole("status")).toHaveTextContent("Copied");

    // Still visible just before the 3000ms deadline.
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Copied");

    // Gone once the full duration has elapsed.
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("calls onClose when Escape is pressed while open", () => {
    mockClipboard();
    const onClose = vi.fn();
    render(
      <HexRevealModal
        open
        value={FULL_VALUE}
        label={LABEL}
        copyConfirmMs={2000}
        onClose={onClose}
      />,
    );

    // Escape closes the modal. (Req 5.6)
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close button is clicked", () => {
    mockClipboard();
    const onClose = vi.fn();
    render(
      <HexRevealModal
        open
        value={FULL_VALUE}
        label={LABEL}
        copyConfirmMs={2000}
        onClose={onClose}
      />,
    );

    // The close button is labelled "Close". (Req 5.6)
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
