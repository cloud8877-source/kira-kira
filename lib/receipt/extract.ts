import { buildVisionPrompt, parseVisionResponse, type ParsedReceipt } from "./prompts";

const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

type MinimalAi = {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
};

// Chunked base64 encoder: safe for multi-MB images without blowing the call stack.
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)),
    );
  }
  return btoa(binary);
}

export async function extractReceiptImpl(
  ai: MinimalAi,
  imageBytes: Uint8Array,
  mime: string,
): Promise<ParsedReceipt> {
  try {
    const dataUri = `data:${mime};base64,${bytesToBase64(imageBytes)}`;
    const response = await ai.run(VISION_MODEL, {
      messages: [
        {
          role: "system",
          content:
            "You are a precise OCR extractor for restaurant receipts. Output ONLY valid JSON.",
        },
        { role: "user", content: buildVisionPrompt() },
      ],
      image: dataUri,
      max_tokens: 256,
      temperature: 0,
    });

    const text =
      typeof response === "string"
        ? response
        : response && typeof response === "object" && "response" in response
          ? String((response as { response: unknown }).response)
          : "";

    return parseVisionResponse(text);
  } catch (err) {
    console.error("[receipt] extract failed:", err);
    return parseVisionResponse("");
  }
}
