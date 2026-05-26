import { buildVisionPrompt, parseVisionResponse, type ParsedReceipt } from "./prompts";

// Primary vision model. Mistral Small 3.1 24B has notably better OCR /
// structured-data extraction than Llama 3.2 11B vision on Cloudflare's
// Workers AI catalog. Llama is kept as the fallback model.
const VISION_MODEL = "@cf/mistralai/mistral-small-3.1-24b-instruct";
const FALLBACK_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

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

async function callMistral(ai: MinimalAi, model: string, dataUri: string) {
  // Mistral on Workers AI uses OpenAI-style chat completions with
  // multimodal content blocks (text + image_url) inside the user message.
  return ai.run(model, {
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildVisionPrompt() },
          { type: "image_url", image_url: { url: dataUri } },
        ],
      },
    ],
    max_tokens: 256,
    temperature: 0,
  });
}

async function callLlamaVision(ai: MinimalAi, model: string, dataUri: string) {
  // Llama 3.2 vision uses the simpler `image:` data-URI key alongside messages.
  return ai.run(model, {
    messages: [
      {
        role: "system",
        content: "You are a precise OCR extractor. Output ONLY valid JSON.",
      },
      { role: "user", content: buildVisionPrompt() },
    ],
    image: dataUri,
    max_tokens: 256,
    temperature: 0,
  });
}

function extractText(response: unknown): string {
  if (typeof response === "string") return response;
  if (!response || typeof response !== "object") return "";

  // OpenAI chat-completion shape: { choices: [{ message: { content: string } }] }
  const obj = response as Record<string, unknown>;
  const choices = obj.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const message = (choices[0] as { message?: { content?: unknown } } | undefined)?.message;
    if (typeof message?.content === "string") return message.content;
    if (message?.content && typeof message.content === "object") {
      return JSON.stringify(message.content);
    }
  }

  // Cloudflare default shape: { response: string|object }
  if ("response" in obj) {
    const inner = obj.response;
    if (typeof inner === "string") return inner;
    if (inner && typeof inner === "object") return JSON.stringify(inner);
  }
  return "";
}

async function callVisionModel(
  ai: MinimalAi,
  model: string,
  dataUri: string,
): Promise<ParsedReceipt> {
  const isMistral = model.includes("mistral");
  const response = isMistral
    ? await callMistral(ai, model, dataUri)
    : await callLlamaVision(ai, model, dataUri);

  console.log(
    `[receipt:${model}] raw response keys=${
      response && typeof response === "object" ? Object.keys(response).join(",") : "(none)"
    }`,
  );
  console.log(
    `[receipt:${model}] raw body: ${JSON.stringify(response).slice(0, 1000)}`,
  );

  return parseVisionResponse(extractText(response));
}

function fieldsExtracted(p: ParsedReceipt): boolean {
  return p.restaurantName !== null || p.totalCents !== null;
}

export async function extractReceiptImpl(
  ai: MinimalAi,
  imageBytes: Uint8Array,
  mime: string,
): Promise<ParsedReceipt> {
  console.log(`[receipt] request: bytes=${imageBytes.byteLength} mime=${mime}`);
  const dataUri = `data:${mime};base64,${bytesToBase64(imageBytes)}`;

  // Try primary model (Mistral) first
  try {
    const primary = await callVisionModel(ai, VISION_MODEL, dataUri);
    console.log(
      `[receipt] primary parsed: name=${primary.restaurantName} totalCents=${primary.totalCents} confidence=${primary.confidence}`,
    );
    if (fieldsExtracted(primary) && primary.confidence !== "low") {
      return primary;
    }
    console.log("[receipt] primary low-quality; trying fallback");
  } catch (err) {
    console.error("[receipt] primary failed:", err);
  }

  // Fallback model (Llama 3.2 vision)
  try {
    const fallback = await callVisionModel(ai, FALLBACK_MODEL, dataUri);
    console.log(
      `[receipt] fallback parsed: name=${fallback.restaurantName} totalCents=${fallback.totalCents} confidence=${fallback.confidence}`,
    );
    return fallback;
  } catch (err) {
    console.error("[receipt] fallback failed:", err);
    return parseVisionResponse("");
  }
}
