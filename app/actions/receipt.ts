"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { extractReceiptImpl } from "@/lib/receipt/extract";
import type { ParsedReceipt } from "@/lib/receipt/prompts";

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_BYTES = 5 * 1024 * 1024;

export type ExtractReceiptResult = ParsedReceipt | { error: string };

export async function extractReceipt(formData: FormData): Promise<ExtractReceiptResult> {
  const file = formData.get("image");
  if (!(file instanceof File)) return { error: "No image provided." };
  if (!ALLOWED_MIMES.has(file.type)) {
    return { error: "Image must be JPEG, PNG, WebP, or HEIC." };
  }
  if (file.size > MAX_BYTES) return { error: "Image too large (max 5 MB)." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { env } = getCloudflareContext();
  return extractReceiptImpl(env.AI, bytes);
}
