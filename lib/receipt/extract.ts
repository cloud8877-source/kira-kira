import { buildVisionPrompt, parseVisionResponse, type ParsedReceipt } from "./prompts";

const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

type MinimalAi = {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
};

export async function extractReceiptImpl(
  ai: MinimalAi,
  imageBytes: Uint8Array,
): Promise<ParsedReceipt> {
  try {
    const response = await ai.run(VISION_MODEL, {
      image: Array.from(imageBytes),
      prompt: buildVisionPrompt(),
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
  } catch {
    return parseVisionResponse("");
  }
}
