import { describe, it, expect } from "vitest";
import {
  validateDepositor,
  validateAmount,
  validateAmountWarning,
  validateTxHash,
} from "@/app/(pages)/deposit/_lib/validate";

describe("validateDepositor", () => {
  it("returns null for a valid cosmos address", () => {
    // cosmos1 + 38 lowercase alphanumeric chars
    const valid = "cosmos1" + "a".repeat(38);
    expect(validateDepositor(valid)).toBeNull();
  });

  it("returns null for a longer valid cosmos address", () => {
    const valid = "cosmos1" + "abc123def456ghi789jkl012mno345pqr678stu9";
    expect(validateDepositor(valid)).toBeNull();
  });

  it("returns error for address not starting with cosmos1", () => {
    const invalid = "osmo1" + "a".repeat(38);
    expect(validateDepositor(invalid)).toBe("Invalid cosmos address");
  });

  it("returns error for address with uppercase characters", () => {
    const invalid = "cosmos1" + "A".repeat(38);
    expect(validateDepositor(invalid)).toBe("Invalid cosmos address");
  });

  it("returns error for address shorter than 38 chars after prefix", () => {
    const invalid = "cosmos1" + "a".repeat(37);
    expect(validateDepositor(invalid)).toBe("Invalid cosmos address");
  });

  it("returns error for empty string", () => {
    expect(validateDepositor("")).toBe("Invalid cosmos address");
  });

  it("returns error for address with special characters", () => {
    const invalid = "cosmos1" + "a".repeat(37) + "!";
    expect(validateDepositor(invalid)).toBe("Invalid cosmos address");
  });
});

describe("validateAmount", () => {
  it("returns null for a valid positive integer", () => {
    expect(validateAmount("100")).toBeNull();
  });

  it("returns null for a large positive integer", () => {
    expect(validateAmount("999999999999999999")).toBeNull();
  });

  it('returns "Amount must be a positive integer" for decimal values', () => {
    expect(validateAmount("10.5")).toBe("Amount must be a positive integer");
  });

  it('returns "Amount must be a positive integer" for non-numeric characters', () => {
    expect(validateAmount("abc")).toBe("Amount must be a positive integer");
  });

  it('returns "Amount must be a positive integer" for mixed input', () => {
    expect(validateAmount("12abc")).toBe("Amount must be a positive integer");
  });

  it('returns "Amount must be a positive integer" for negative sign', () => {
    expect(validateAmount("-5")).toBe("Amount must be a positive integer");
  });

  it('returns "Amount must be greater than 0" for zero', () => {
    expect(validateAmount("0")).toBe("Amount must be greater than 0");
  });

  it('returns "Amount must be a positive integer" for empty string', () => {
    expect(validateAmount("")).toBe("Amount must be a positive integer");
  });

  it('returns "Amount must be a positive integer" for whitespace', () => {
    expect(validateAmount(" ")).toBe("Amount must be a positive integer");
  });
});

describe("validateAmountWarning", () => {
  it("returns null when amount equals balance", () => {
    expect(validateAmountWarning("100", "100")).toBeNull();
  });

  it("returns null when amount is less than balance", () => {
    expect(validateAmountWarning("50", "100")).toBeNull();
  });

  it("returns warning when amount exceeds balance", () => {
    expect(validateAmountWarning("200", "100")).toBe(
      "Amount exceeds available balance"
    );
  });

  it("handles large numbers correctly via BigInt", () => {
    const largeAmount = "9999999999999999999";
    const smallBalance = "1000000000000000000";
    expect(validateAmountWarning(largeAmount, smallBalance)).toBe(
      "Amount exceeds available balance"
    );
  });

  it("returns null for equal large numbers", () => {
    const value = "9999999999999999999";
    expect(validateAmountWarning(value, value)).toBeNull();
  });
});

describe("validateTxHash", () => {
  it("returns null for a valid tx hash", () => {
    expect(validateTxHash("0x1234567890abcdef")).toBeNull();
  });

  it("returns null for a hash with exactly 10 characters", () => {
    expect(validateTxHash("0x12345678")).toBeNull();
  });

  it('returns "Suspicious tx hash" for hash without 0x prefix', () => {
    expect(validateTxHash("1234567890abcdef")).toBe("Suspicious tx hash");
  });

  it('returns "Suspicious tx hash" for hash shorter than 10 characters', () => {
    expect(validateTxHash("0x1234")).toBe("Suspicious tx hash");
  });

  it('returns "Suspicious tx hash" for empty string', () => {
    expect(validateTxHash("")).toBe("Suspicious tx hash");
  });

  it('returns "Suspicious tx hash" for just "0x"', () => {
    expect(validateTxHash("0x")).toBe("Suspicious tx hash");
  });
});
