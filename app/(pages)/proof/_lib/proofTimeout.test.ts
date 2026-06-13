import { describe, it, expect, vi, afterEach } from "vitest";
import { createProofTimeout } from "./proofTimeout";

describe("createProofTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns signal that is not aborted at creation time", () => {
    vi.useFakeTimers();
    const { signal, clear } = createProofTimeout(60_000);

    expect(signal.aborted).toBe(false);
    clear();
  });

  it("aborts the signal after ms elapsed without clear()", () => {
    vi.useFakeTimers();
    const { signal } = createProofTimeout(60_000);

    expect(signal.aborted).toBe(false);

    vi.advanceTimersByTime(59_999);
    expect(signal.aborted).toBe(false);

    vi.advanceTimersByTime(1);
    expect(signal.aborted).toBe(true);
  });

  it("does not abort the signal when clear() is called before timeout", () => {
    vi.useFakeTimers();
    const { signal, clear } = createProofTimeout(60_000);

    vi.advanceTimersByTime(30_000);
    clear();

    vi.advanceTimersByTime(60_000);
    expect(signal.aborted).toBe(false);
  });

  it("clear() can be called multiple times safely", () => {
    vi.useFakeTimers();
    const { signal, clear } = createProofTimeout(60_000);

    clear();
    clear();

    vi.advanceTimersByTime(60_000);
    expect(signal.aborted).toBe(false);
  });
});
