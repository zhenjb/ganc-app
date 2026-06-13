// =============================================================================
// FE-07 Proof Screen — ProofScreen unit tests
// -----------------------------------------------------------------------------
// Covers:
//   - Empty state rendering when session has no data (Req 8.1, 8.2)
//   - Generate button disabled when session is empty (Req 8.2)
//   - Error banner display on API failure (Req 5.2)
//   - Timeout banner display with Retry button (Req 4.5)
//   - Confirm dialog flow when proofBundle exists (Req 9.1, 9.3)
//   - Proof result sections render when ready (ProofBytesPanel, PublicInputsTable,
//     VerificationKeyChip)
//
// Strategy: Mock `useBatchSession` and `useProofGenerate` at module level so we
// can control their return values directly without a full provider tree.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { AppState } from "@/app/lib/interfaces/state";
import type { ProofBundle } from "@/app/lib/interfaces/proof";
import type { UseProofGenerateResult } from "../../_types";

// --- Module mocks -----------------------------------------------------------

vi.mock("@/app/lib/contexts/BatchSessionContext", () => ({
  useBatchSession: vi.fn(),
}));

vi.mock("../../_lib/useProofGenerate", () => ({
  useProofGenerate: vi.fn(),
}));

// Mock next/link to render a plain anchor for testability.
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Import after mocks are declared so vi.mock hoisting takes effect.
import { useBatchSession } from "@/app/lib/contexts/BatchSessionContext";
import { useProofGenerate } from "../../_lib/useProofGenerate";
import { ProofScreen } from "./ProofScreen";

// --- Fixtures ---------------------------------------------------------------

const MOCK_STATE: AppState = {
  mode: "mock",
  currentStateRoot: "0x123",
  balances: { userBalances: {}, moduleAccountBalance: "0" },
  depositStatus: "idle",
  withdrawStatus: "idle",
  proofStatus: "idle",
  batchStatus: "idle",
};

const MOCK_SESSION_EMPTY = {
  commitments: null,
  witness: null,
  stale: false,
  setBatch: vi.fn(),
  markStale: vi.fn(),
  reset: vi.fn(),
};

const MOCK_SESSION_READY = {
  commitments: {
    publicInputs: {
      oldStateRoot: "0x01",
      newStateRoot: "0x02",
      depositsRoot: "0x03",
      withdrawalsRoot: "0x04",
      nullifiersRoot: "0x05",
      withdrawOutputsRoot: "0x06",
    },
    batchHash: "0xhash",
  },
  witness: { accounts: [] },
  stale: false,
  setBatch: vi.fn(),
  markStale: vi.fn(),
  reset: vi.fn(),
};

const VALID_BUNDLE: ProofBundle = {
  proof: "0xabcdef1234567890abcdef1234567890deadbeef",
  publicInputs: ["0x01", "0x02", "0x03", "0x04", "0x05", "0x06"],
  verificationKeyId: "local-v1",
};

/** Default idle hook state — no errors, no bundle. */
function makeHookResult(
  overrides?: Partial<UseProofGenerateResult>,
): UseProofGenerateResult {
  return {
    proofStatus: "idle",
    proofBundle: null,
    error: false,
    timedOut: false,
    invalidInputs: false,
    generate: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  };
}

// --- Setup ------------------------------------------------------------------

const mockedUseBatchSession = vi.mocked(useBatchSession);
const mockedUseProofGenerate = vi.mocked(useProofGenerate);

beforeEach(() => {
  mockedUseBatchSession.mockReset();
  mockedUseProofGenerate.mockReset();

  // jsdom does not implement <dialog>. Mock showModal to set the `open`
  // attribute so the content becomes accessible in the accessibility tree,
  // and mock close to remove it.
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

afterEach(() => {
  cleanup();
});

// --- Tests ------------------------------------------------------------------

describe("ProofScreen", () => {
  // ---------------------------------------------------------------------------
  // Empty state (Req 8.1, 8.2)
  // ---------------------------------------------------------------------------

  describe("empty state (Req 8.1, 8.2)", () => {
    it("renders 'Session expired' message and 'Back to Batch' link when commitments=null", () => {
      mockedUseBatchSession.mockReturnValue(MOCK_SESSION_EMPTY);
      mockedUseProofGenerate.mockReturnValue(makeHookResult());

      render(
        <ProofScreen
          state={MOCK_STATE}
          refresh={vi.fn()}
          inFlight={false}
        />,
      );

      expect(
        screen.getByText("Session expired — rebuild the batch."),
      ).toBeInTheDocument();

      const backLink = screen.getByRole("link", { name: "Back to Batch" });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute("href", "/batch");
    });

    it("renders Generate Proof button as disabled when session is empty (Req 8.2)", () => {
      mockedUseBatchSession.mockReturnValue(MOCK_SESSION_EMPTY);
      mockedUseProofGenerate.mockReturnValue(makeHookResult());

      render(
        <ProofScreen
          state={MOCK_STATE}
          refresh={vi.fn()}
          inFlight={false}
        />,
      );

      const button = screen.getByRole("button", { name: /Generate Proof/i });
      expect(button).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // Error banner (Req 5.2)
  // ---------------------------------------------------------------------------

  describe("error banner (Req 5.2)", () => {
    it("renders 'Internal Server Error' banner when error=true and timedOut=false", () => {
      mockedUseBatchSession.mockReturnValue(MOCK_SESSION_READY);
      mockedUseProofGenerate.mockReturnValue(
        makeHookResult({ error: true, timedOut: false }),
      );

      render(
        <ProofScreen
          state={MOCK_STATE}
          refresh={vi.fn()}
          inFlight={false}
        />,
      );

      expect(screen.getByText("Internal Server Error")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Timeout banner with Retry (Req 4.5)
  // ---------------------------------------------------------------------------

  describe("timeout banner (Req 4.5)", () => {
    it("renders timeout message and Retry button when error=true and timedOut=true", () => {
      mockedUseBatchSession.mockReturnValue(MOCK_SESSION_READY);
      mockedUseProofGenerate.mockReturnValue(
        makeHookResult({ error: true, timedOut: true }),
      );

      render(
        <ProofScreen
          state={MOCK_STATE}
          refresh={vi.fn()}
          inFlight={false}
        />,
      );

      expect(
        screen.getByText("Proof generation timed out (60s)."),
      ).toBeInTheDocument();

      const retryButton = screen.getByRole("button", { name: "Retry" });
      expect(retryButton).toBeInTheDocument();
    });

    it("does NOT show 'Internal Server Error' when timedOut=true", () => {
      mockedUseBatchSession.mockReturnValue(MOCK_SESSION_READY);
      mockedUseProofGenerate.mockReturnValue(
        makeHookResult({ error: true, timedOut: true }),
      );

      render(
        <ProofScreen
          state={MOCK_STATE}
          refresh={vi.fn()}
          inFlight={false}
        />,
      );

      expect(screen.queryByText("Internal Server Error")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Confirm dialog flow (Req 9.1, 9.3)
  // ---------------------------------------------------------------------------

  describe("confirm dialog (Req 9.1, 9.3)", () => {
    it("shows confirm dialog when proofBundle is not null and user clicks Generate Proof (Req 9.1)", () => {
      mockedUseBatchSession.mockReturnValue(MOCK_SESSION_READY);
      const generateFn = vi.fn();
      mockedUseProofGenerate.mockReturnValue(
        makeHookResult({ proofBundle: VALID_BUNDLE, generate: generateFn }),
      );

      render(
        <ProofScreen
          state={MOCK_STATE}
          refresh={vi.fn()}
          inFlight={false}
        />,
      );

      const generateButton = screen.getByRole("button", {
        name: /Generate Proof/i,
      });
      fireEvent.click(generateButton);

      // Confirm dialog content should be visible.
      expect(
        screen.getByText(
          "The current proof will be replaced. Do you want to continue?",
        ),
      ).toBeInTheDocument();

      // Confirm and Cancel buttons in the dialog.
      expect(
        screen.getByRole("button", { name: "Overwrite" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();

      // generate should NOT have been called yet (waiting for confirm).
      expect(generateFn).not.toHaveBeenCalled();
    });

    it("Cancel button closes dialog without generating (Req 9.3)", () => {
      mockedUseBatchSession.mockReturnValue(MOCK_SESSION_READY);
      const generateFn = vi.fn();
      mockedUseProofGenerate.mockReturnValue(
        makeHookResult({ proofBundle: VALID_BUNDLE, generate: generateFn }),
      );

      render(
        <ProofScreen
          state={MOCK_STATE}
          refresh={vi.fn()}
          inFlight={false}
        />,
      );

      // Open the confirm dialog.
      fireEvent.click(
        screen.getByRole("button", { name: /Generate Proof/i }),
      );

      // Click Cancel.
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      // Dialog message should be gone.
      expect(
        screen.queryByText(
          "The current proof will be replaced. Do you want to continue?",
        ),
      ).not.toBeInTheDocument();

      // generate() was never called.
      expect(generateFn).not.toHaveBeenCalled();
    });

    it("does NOT show confirm dialog when proofBundle is null — generates directly (Req 9.4)", () => {
      mockedUseBatchSession.mockReturnValue(MOCK_SESSION_READY);
      const generateFn = vi.fn().mockResolvedValue(undefined);
      const clearErrorFn = vi.fn();
      mockedUseProofGenerate.mockReturnValue(
        makeHookResult({
          proofBundle: null,
          generate: generateFn,
          clearError: clearErrorFn,
        }),
      );

      render(
        <ProofScreen
          state={MOCK_STATE}
          refresh={vi.fn()}
          inFlight={false}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: /Generate Proof/i }),
      );

      // No dialog should appear.
      expect(
        screen.queryByText(
          "The current proof will be replaced. Do you want to continue?",
        ),
      ).not.toBeInTheDocument();

      // generate() is called directly.
      expect(generateFn).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Proof result sections render when ready
  // ---------------------------------------------------------------------------

  describe("proof result rendering", () => {
    it("renders ProofBytesPanel, PublicInputsTable, VerificationKeyChip when proofStatus=ready", () => {
      mockedUseBatchSession.mockReturnValue(MOCK_SESSION_READY);
      mockedUseProofGenerate.mockReturnValue(
        makeHookResult({
          proofStatus: "ready",
          proofBundle: VALID_BUNDLE,
        }),
      );

      render(
        <ProofScreen
          state={MOCK_STATE}
          refresh={vi.fn()}
          inFlight={false}
        />,
      );

      // ProofBytesPanel renders a copy button.
      expect(
        screen.getByRole("button", { name: "Copy proof to clipboard" }),
      ).toBeInTheDocument();

      // PublicInputsTable renders a table.
      expect(screen.getByRole("table")).toBeInTheDocument();

      // VerificationKeyChip renders the keyId verbatim.
      expect(screen.getByText("local-v1")).toBeInTheDocument();
    });

    it("does NOT render result sections when proofStatus is not ready", () => {
      mockedUseBatchSession.mockReturnValue(MOCK_SESSION_READY);
      mockedUseProofGenerate.mockReturnValue(
        makeHookResult({ proofStatus: "idle", proofBundle: null }),
      );

      render(
        <ProofScreen
          state={MOCK_STATE}
          refresh={vi.fn()}
          inFlight={false}
        />,
      );

      expect(
        screen.queryByRole("button", { name: "Copy proof to clipboard" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Button aria attributes while generating (Req 10.6)
  // ---------------------------------------------------------------------------

  describe("generating state (Req 10.6)", () => {
    it("sets aria-busy and aria-disabled on Generate button while generating", () => {
      mockedUseBatchSession.mockReturnValue(MOCK_SESSION_READY);
      mockedUseProofGenerate.mockReturnValue(
        makeHookResult({ proofStatus: "generating" }),
      );

      render(
        <ProofScreen
          state={MOCK_STATE}
          refresh={vi.fn()}
          inFlight={false}
        />,
      );

      const button = screen.getByRole("button", { name: /Generating/i });
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).toBeDisabled();
    });
  });
});
