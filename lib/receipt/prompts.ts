const ALLOWED_CONFIDENCE = ["high", "medium", "low"] as const;
type Confidence = (typeof ALLOWED_CONFIDENCE)[number];

const ALLOWED_CURRENCIES = ["MYR", "USD", "SGD"] as const;
type Currency = (typeof ALLOWED_CURRENCIES)[number];

export type ParsedReceipt = {
  restaurantName: string | null;
  totalCents: number | null;
  currency: Currency | null;
  confidence: Confidence;
};

const FALLBACK: ParsedReceipt = {
  restaurantName: null,
  totalCents: null,
  currency: null,
  confidence: "low",
};

export function buildVisionPrompt(): string {
  return `You extract bill data from an image. The image may be a restaurant receipt, a printed bill, OR a payment-app confirmation screen (Touch'n Go eWallet, GrabPay, Boost, ShopeePay, DuitNow, PayPal, Stripe, etc.).

Return ONLY valid JSON with this exact shape, no prose, no markdown:
{"restaurantName": string|null, "totalCents": integer|null, "currency": "MYR"|"USD"|"SGD"|null, "confidence": "high"|"medium"|"low"}

Rules:
- restaurantName: the merchant / restaurant / shop / payee name (e.g. "Watson's", "Kopi House Bangsar", "Starbucks"). If the image only shows a personal name or no merchant, return null.
- totalCents: convert the bill amount to INTEGER CENTS (multiply RM/USD value by 100). RM 12.50 -> 1250. RM 11.60 -> 1160. $4.99 -> 499. Ignore the minus sign on payment-app screens — only the magnitude matters.
- Look for the BIGGEST, BOLDEST money amount on the screen first — that's almost always the total. Ignore small numbers like points, tax line items, or reference numbers.
- currency: detect from RM/MYR (MYR), $/USD (USD), S$/SGD (SGD). Default to MYR if unclear in a Malaysian context.
- confidence: "high" only if you read the total amount clearly and unambiguously; "medium" if you had to interpret; "low" if you're guessing.
- If you cannot read a field, return null for it (don't guess).
- Output ONLY the JSON object. No markdown fences, no explanation, no preamble.`;
}

function isConfidence(value: unknown): value is Confidence {
  return typeof value === "string" && (ALLOWED_CONFIDENCE as readonly string[]).includes(value);
}

function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (ALLOWED_CURRENCIES as readonly string[]).includes(value);
}

export function parseVisionResponse(raw: unknown): ParsedReceipt {
  if (typeof raw !== "string") return FALLBACK;

  let text = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first < 0 || last < first) return FALLBACK;
  text = text.slice(first, last + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return FALLBACK;
  }
  if (!parsed || typeof parsed !== "object") return FALLBACK;
  const obj = parsed as Record<string, unknown>;

  const rawName = obj.restaurantName;
  const trimmedName =
    typeof rawName === "string" ? rawName.trim() : "";
  const restaurantName =
    trimmedName.length > 0 && trimmedName.length <= 120 ? trimmedName : null;

  const rawTotal = obj.totalCents;
  // Sanity floor at 100 cents (RM 1.00) — under-RM-1 totals are almost always
  // model hallucinations (e.g. the model misreading RM 11.60 as 61 cents).
  // Real human-paid bills start around RM 1.
  const totalCents =
    typeof rawTotal === "number" &&
    Number.isInteger(rawTotal) &&
    rawTotal >= 100 &&
    rawTotal <= 100_000_000
      ? rawTotal
      : null;

  const currency: Currency | null = isCurrency(obj.currency) ? obj.currency : null;
  const confidence: Confidence = isConfidence(obj.confidence) ? obj.confidence : "low";

  return { restaurantName, totalCents, currency, confidence };
}
