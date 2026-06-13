import { describe, it, expect } from "vitest";
import { shortenHex } from "./format";

describe("shortenHex", () => {
  it("returns empty string for non-string input", () => {
    expect(shortenHex(undefined)).toBe("");
    expect(shortenHex(null)).toBe("");
    expect(shortenHex(123)).toBe("");
    expect(shortenHex({})).toBe("");
  });

  it("returns the original string when length <= 18", () => {
    expect(shortenHex("")).toBe("");
    expect(shortenHex("0x")).toBe("0x");
    expect(shortenHex("0xabcdef1234")).toBe("0xabcdef1234");
    // Exactly 18 chars — boundary case
    expect(shortenHex("0x1234567890abcdef")).toBe("0x1234567890abcdef");
  });

  it("shortens strings longer than 18 chars", () => {
    // 19 chars: first 10 + "…" + last 6
    const input19 = "0x1234567890abcdefg";
    expect(input19.length).toBe(19);
    expect(shortenHex(input19)).toBe("0x12345678\u2026bcdefg");

    // Typical 66-char hex string (0x + 64 hex digits)
    const long = "0xb3f5fcb2b8489b5507277dc25250f7c78203dd6292ba5e52ba7bb4d190afa96f";
    expect(shortenHex(long)).toBe("0xb3f5fcb2\u2026afa96f");
  });

  it("output length is exactly 17 for strings longer than 18", () => {
    const long = "0xb3f5fcb2b8489b5507277dc25250f7c78203dd6292ba5e52ba7bb4d190afa96f";
    expect(shortenHex(long).length).toBe(17);
  });

  it("is a pure function — same input always gives same output", () => {
    const input = "0xb3f5fcb2b8489b5507277dc25250f7c78203dd6292ba5e52ba7bb4d190afa96f";
    const result1 = shortenHex(input);
    const result2 = shortenHex(input);
    expect(result1).toBe(result2);
  });
});
