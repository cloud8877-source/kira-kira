import { describe, expect, it } from "vitest";
import { formatRm, toCents, toRm } from "@/lib/money";

describe("money conversion", () => {
  it("converts RM display input to integer cents", () => {
    expect(toCents("60")).toBe(6000);
    expect(toCents("60.5")).toBe(6050);
    expect(toCents("0.01")).toBe(1);
  });

  it("rejects invalid RM display input", () => {
    expect(() => toCents("")).toThrow("Invalid RM amount");
    expect(() => toCents("12.345")).toThrow("Invalid RM amount");
    expect(() => toCents("-1")).toThrow("Invalid RM amount");
  });

  it("formats integer cents for display", () => {
    expect(toRm(6000)).toBe("60.00");
    expect(toRm(1)).toBe("0.01");
    expect(formatRm(6050)).toBe("RM 60.50");
  });
});
