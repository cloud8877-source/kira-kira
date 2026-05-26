"use server";

import { nanoid } from "nanoid";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  deleteReceiptFromR2,
  uploadPaymentQrToR2,
} from "@/lib/receipts/storage";

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_BYTES = 5 * 1024 * 1024;
const PAYMENT_KEY_PATTERN =
  /^payments\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.(jpg|png|webp|heic|heif|bin)$/u;

export type UploadPaymentQrResult =
  | { paymentQrKey: string; paymentQrMime: string; paymentQrUploadedAt: number }
  | { error: string };

function validate(file: unknown): { file: File } | { error: string } {
  if (!(file instanceof File)) return { error: "No image provided." };
  if (!ALLOWED_MIMES.has(file.type)) {
    return { error: "Image must be JPEG, PNG, WebP, or HEIC." };
  }
  if (file.size > MAX_BYTES) return { error: "Image too large (max 5 MB)." };
  return { file };
}

export async function uploadPaymentQr(formData: FormData): Promise<UploadPaymentQrResult> {
  const v = validate(formData.get("image"));
  if ("error" in v) return v;

  const tempBillId = `pending-${nanoid(8)}`;
  const bytes = new Uint8Array(await v.file.arrayBuffer());

  try {
    const { env } = getCloudflareContext();
    const { key } = await uploadPaymentQrToR2(env.RECEIPTS, tempBillId, bytes, v.file.type);
    return {
      paymentQrKey: key,
      paymentQrMime: v.file.type,
      paymentQrUploadedAt: Math.floor(Date.now() / 1000),
    };
  } catch (err) {
    console.error("[payment-qr] upload failed:", err);
    return { error: "Couldn't save the payment QR — try again." };
  }
}

export async function deletePaymentQr(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const key = formData.get("key");
  if (typeof key !== "string" || !PAYMENT_KEY_PATTERN.test(key)) {
    return { error: "Invalid payment-QR key." };
  }
  try {
    const { env } = getCloudflareContext();
    await deleteReceiptFromR2(env.RECEIPTS, key);
    return { ok: true };
  } catch (err) {
    console.error("[payment-qr] delete failed:", err);
    return { error: "Couldn't delete the payment QR." };
  }
}
