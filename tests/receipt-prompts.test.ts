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
    const result = await extractReceiptImpl(stubAi, new Uint8Array([0xff, 0xd8]), "image/jpeg");
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
    const result = await extractReceiptImpl(stubAi, new Uint8Array(), "image/png");
    expect(result.confidence).toBe("low");
    expect(result.totalCents).toBeNull();
    expect(result.restaurantName).toBeNull();
  });

  it("accepts plain-string AI response (some models return a bare string)", async () => {
    const stubAi = {
      run: async () =>
        '{"restaurantName":"Plain Cafe","totalCents":300,"currency":"USD","confidence":"medium"}',
    };
    const result = await extractReceiptImpl(stubAi, new Uint8Array(), "image/webp");
    expect(result).toMatchObject({ restaurantName: "Plain Cafe", totalCents: 300, currency: "USD" });
  });

  it("handles auto-parsed object response (Workers AI JSON-mode)", async () => {
    // Workers AI sometimes returns response.response as an already-parsed object
    const stubAi = {
      run: async () => ({
        response: {
          restaurantName: "Auto-Parsed Cafe",
          totalCents: 1500,
          currency: "MYR",
          confidence: "high",
        },
        tool_calls: [],
        usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
      }),
    };
    const result = await extractReceiptImpl(stubAi, new Uint8Array(), "image/jpeg");
    expect(result).toEqual({
      restaurantName: "Auto-Parsed Cafe",
      totalCents: 1500,
      currency: "MYR",
      confidence: "high",
    });
  });

  it("calls Mistral primary with OpenAI multimodal content blocks", async () => {
    const calls: Array<{ model: string; input: Record<string, unknown> }> = [];
    const stubAi = {
      run: async (model: string, input: Record<string, unknown>) => {
        calls.push({ model, input });
        return {
          choices: [
            {
              message: {
                content:
                  '{"restaurantName":"X","totalCents":1500,"currency":"MYR","confidence":"high"}',
              },
            },
          ],
        };
      },
    };
    await extractReceiptImpl(stubAi, new Uint8Array([0xff, 0xd8]), "image/jpeg");
    expect(calls[0]?.model).toContain("mistral");
    const messages = calls[0]?.input.messages as Array<{ content: unknown }>;
    expect(Array.isArray(messages)).toBe(true);
    const content = messages[0]?.content as Array<{ type: string; image_url?: { url: string } }>;
    expect(Array.isArray(content)).toBe(true);
    const imageBlock = content.find((b) => b.type === "image_url");
    expect(imageBlock?.image_url?.url ?? "").toMatch(/^data:image\/jpeg;base64,/);
  });

  it("falls back to Llama (image: data URI) when Mistral returns low quality", async () => {
    const calls: Array<{ model: string; input: Record<string, unknown> }> = [];
    const stubAi = {
      run: async (model: string, input: Record<string, unknown>) => {
        calls.push({ model, input });
        if (model.includes("mistral")) {
          return { choices: [{ message: { content: "I don't know" } }] };
        }
        return {
          response:
            '{"restaurantName":"Fallback","totalCents":2000,"currency":"MYR","confidence":"high"}',
        };
      },
    };
    const result = await extractReceiptImpl(stubAi, new Uint8Array([0xff, 0xd8]), "image/png");
    expect(calls).toHaveLength(2);
    expect(calls[0]?.model).toContain("mistral");
    expect(calls[1]?.model).toContain("llama");
    const llamaInput = calls[1]?.input as Record<string, unknown>;
    expect(String(llamaInput.image ?? "")).toMatch(/^data:image\/png;base64,/);
    expect(result.restaurantName).toBe("Fallback");
  });
});
