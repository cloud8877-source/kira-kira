import { describe, expect, it } from "vitest";
import { buildNudgeUrl, normalizePhone } from "@/lib/whatsapp";

const nudgeInput = {
  name: "Amin",
  amountCents: 1250,
  billTitle: "Kopi susu",
  publicUrl: "https://kira.test/b/bill123",
};

describe("normalizePhone", () => {
  it("strips non-digits and keeps valid phone numbers", () => {
    expect(normalizePhone("+60 12-345 6789")).toBe("60123456789");
    expect(normalizePhone("(03) 1234 5678")).toBe("0312345678");
  });

  it("returns null for missing or short phone numbers", () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone("0123456")).toBeNull();
    expect(normalizePhone("not a phone")).toBeNull();
  });
});

describe("buildNudgeUrl", () => {
  it("returns a wa.me URL with encoded nudge text when phone is available", () => {
    const result = buildNudgeUrl({
      ...nudgeInput,
      phone: "+60 12-345 6789",
    });

    expect(result.text).toBe(
      'Hey Amin, you still owe RM 12.50 for "Kopi susu" — settle here: https://kira.test/b/bill123',
    );
    expect(result.wa).toBe(
      "https://wa.me/60123456789?text=" + encodeURIComponent(result.text),
    );
  });

  it("returns clipboard-only text when phone is missing", () => {
    const result = buildNudgeUrl(nudgeInput);

    expect(result).toEqual({
      text: 'Hey Amin, you still owe RM 12.50 for "Kopi susu" — settle here: https://kira.test/b/bill123',
    });
  });
});
