// =============================================================================
// Proof Screen (FE-07) — ProofStatusBadge unit tests
// -----------------------------------------------------------------------------
// Validates that the badge renders the correct label, role, and aria-label for
// each ProofGenerationStatus value.
//
// Requirements: 1.1, 1.2, 1.3, 10.1
// =============================================================================

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ProofGenerationStatus } from "@/app/(pages)/proof/_types";

import { ProofStatusBadge } from "./ProofStatusBadge";

describe("ProofStatusBadge", () => {
  const statuses: Array<{ status: ProofGenerationStatus; label: string }> = [
    { status: "idle", label: "Idle" },
    { status: "generating", label: "Generating" },
    { status: "ready", label: "Ready" },
  ];

  it.each(statuses)(
    'renders "$label" with correct aria-label for status "$status"',
    ({ status, label }) => {
      render(<ProofStatusBadge status={status} />);

      const badge = screen.getByRole("status");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(label);
      expect(badge).toHaveAttribute("aria-label", `Proof status: ${status}`);
    },
  );

  it("applies distinct CSS classes per status", () => {
    const { rerender } = render(<ProofStatusBadge status="idle" />);
    const badge = screen.getByRole("status");

    // Each status should have at least one status-specific class
    const idleClasses = badge.className;

    rerender(<ProofStatusBadge status="generating" />);
    const generatingClasses = badge.className;

    rerender(<ProofStatusBadge status="ready" />);
    const readyClasses = badge.className;

    // All three sets of classes must be different from each other
    expect(idleClasses).not.toBe(generatingClasses);
    expect(idleClasses).not.toBe(readyClasses);
    expect(generatingClasses).not.toBe(readyClasses);
  });
});
