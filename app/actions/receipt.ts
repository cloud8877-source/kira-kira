"use server";

import { nanoid } from "nanoid";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { extractReceiptImpl } from "@/lib/receipt/extract";
import type { ParsedReceipt } from "@/lib/receipt/prompts";
import { uploadReceiptToR2 } from "@/lib/receipts/storage";

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_BYTES = 5 * 1024 * 1024;

export type ExtractReceiptResult = ParsedReceipt | { error: string };
export type UploadReceiptResult =
  | { receiptKey: string; receiptMime: string; receiptUploadedAt: number }
  | { error: string };

function validate(file: unknown): { file: File } | { error: string } {
  if (!(file instanceof File)) return { error: "No image provided." };
  if (!ALLOWED_MIMES.has(file.type)) {
    return { error: "Image must be JPEG, PNG, WebP, or HEIC." };
  }
  if (file.size > MAX_BYTES) return { error: "Image too large (max 5 MB)." };
  return { file };
}

export async function extractReceipt(formData: FormData): Promise<ExtractReceiptResult> {
  const v = validate(formData.get("image"));
  if ("error" in v) return v;

  const bytes = new Uint8Array(await v.file.arrayBuffer());
  const { env } = getCloudflareContext();
  return extractReceiptImpl(env.AI, bytes, v.file.type);
}

export async function uploadReceipt(formData: FormData): Promise<UploadReceiptResult> {
  const v = validate(formData.get("image"));
  if ("error" in v) return v;

  // We don't know the bill id at upload time (the bill is created after
  // the form is submitted). Use a temporary 'pending-' prefix; the R2
  // lifecycle rule expires these after 7 days regardless of whether a
  // bill ever claims them, so orphaned uploads self-clean.
  const tempBillId = `pending-${nanoid(8)}`;
  const bytes = new Uint8Array(await v.file.arrayBuffer());

  try {
    const { env } = getCloudflareContext();
    const { key } = await uploadReceiptToR2(env.RECEIPTS, tempBillId, bytes, v.file.type);
    return {
      receiptKey: key,
      receiptMime: v.file.type,
      receiptUploadedAt: Math.floor(Date.now() / 1000),
    };
  } catch (err) {
    console.error("[receipt] upload failed:", err);
    return { error: "Couldn't save the receipt — try again." };
  }
}
