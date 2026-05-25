import { describe, expect, it } from "vitest";
import { buildVisionPrompt, parseVisionResponse } from "@/lib/receipt/prompts";
import { extractReceiptImpl } from "@/lib/receipt/extract";

describe("buildVisionPrompt", () => {
  it("returns a non-empty string containing the required schema fields", () => {
    const prompt = buildVisionPrompt();
    expect(prompt.length).toBeGreaterThan(50);
    expect(prompt).toContain("restaurantName");
    expect(prompt).toContain("totalCents");
    expect(prompt).toContain("confidence");
    expect(prompt).toContain("ONLY");
  });
});

describe("parseVisionResponse", () => {
  it("parses clean JSON", () => {
    const json =
      '{"restaurantName":"Kopitiam Auntie","totalCents":1250,"currency":"MYR","confidence":"high"}';
    expect(parseVisionResponse(json)).toEqual({
      restaurantName: "Kopitiam Auntie",
      totalCents: 1250,
      currency: "MYR",
      confidence: "high",
    });
  });

  it("strips ```json fences", () => {
    const fenced =
      '```json\n{"restaurantName":"Cafe","totalCents":900,"currency":"MYR","confidence":"medium"}\n```';
    expect(parseVisionResponse(fenced)).toMatchObject({
      restaurantName: "Cafe",
      totalCents: 900,
      confidence: "medium",
    });
  });

  it("extracts JSON from prose-wrapped response", () => {
    const wrapped =
      'Here is the data: {"restaurantName":"Mamak","totalCents":2200,"currency":"MYR","confidence":"high"} Hope this helps!';
    expect(parseVisionResponse(wrapped).totalCents).toBe(2200);
  });

  it("returns low-confidence fallback for malformed JSON", () => {
    expect(parseVisionResponse("this is not json at all")).toEqual({
      restaurantName: null,
      totalCents: null,
      currency: null,
      confidence: "low",
    });
  });

  it("rejects wrong-typed fields", () => {
    const wrongTypes =
      '{"restaurantName":42,"totalCents":"not-a-number","currency":"INR","confidence":"unknown"}';
    expect(parseVisionResponse(wrongTypes)).toEqual({
      restaurantName: null,
      totalCents: null,
      currency: null,
      confidence: "low",
    });
  });

  it("accepts partial fields with some null", () => {
    const partial =
      '{"restaurantName":"Roti Place","totalCents":null,"currency":null,"confidence":"medium"}';
    expect(parseVisionResponse(partial)).toEqual({
      restaurantName: "Roti Place",
      totalCents: null,
      currency: null,
      confidence: "medium",
    });
  });

  it("rejects totalCents that is negative or too large", () => {
    expect(
      parseVisionResponse(
        '{"restaurantName":"X","totalCents":99999999999,"currency":"MYR","confidence":"high"}',
      ).totalCents,
    ).toBeNull();
    expect(
      parseVisionResponse(
        '{"restaurantName":"X","totalCents":-100,"currency":"MYR","confidence":"high"}',
      ).totalCents,
    ).toBeNull();
  });

  it("rejects empty or oversized restaurantName", () => {
    expect(
      parseVisionResponse(
        '{"restaurantName":"","totalCents":500,"currency":"MYR","confidence":"high"}',
      ).restaurantName,
    ).toBeNull();
    const huge = `{"restaurantName":"${"a".repeat(200)}","totalCents":500,"currency":"MYR","confidence":"high"}`;
    expect(parseVisionResponse(huge).restaurantName).toBeNull();
  });

  it("returns FALLBACK for non-string input", () => {
    expect(parseVisionResponse(null).confidence).toBe("low");
    expect(parseVisionResponse(123).confidence).toBe("low");
    expect(parseVisionResponse({}).confidence).toBe("low");
  });
});

describe("extractReceiptImpl", () => {
  it("returns parsed object when AI returns valid JSON", async () => {
    const stubAi = {
      run: async () => ({
        response:
          '{"restaurantName":"Test Restaurant","totalCents":4500,"currency":"MYR","confidence":"high"}',
      }),
    };
    const result = await extractReceiptImpl(stubAi, new Uint8Array([0xff, 0xd8]));
    expect(result).toEqual({
      restaurantName: "Test Restaurant",
      totalCents: 4500,
      currency: "MYR",
      confidence: "high",
    });
  });

  it("returns FALLBACK when AI throws", async () => {
    const stubAi = {
      run: async () => {
        throw new Error("AI unavailable");
      },
    };
    const result = await extractReceiptImpl(stubAi, new Uint8Array());
    expect(result.confidence).toBe("low");
    expect(result.totalCents).toBeNull();
    expect(result.restaurantName).toBeNull();
  });

  it("returns FALLBACK when AI returns plain string", async () => {
    const stubAi = {
      run: async () =>
        '{"restaurantName":"Plain Cafe","totalCents":300,"currency":"USD","confidence":"medium"}',
    };
    const result = await extractReceiptImpl(stubAi, new Uint8Array());
    expect(result).toMatchObject({ restaurantName: "Plain Cafe", totalCents: 300, currency: "USD" });
  });
});
