"use server";

import { nanoid } from "nanoid";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  deleteReceiptFromR2,
  uploadTransferProofToR2,
} from "@/lib/receipts/storage";

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_BYTES = 5 * 1024 * 1024;
const TRANSFER_KEY_PATTERN =
  /^transfers\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.(jpg|png|webp|heic|heif|bin)$/u;

export type UploadTransferProofResult =
  | {
      transferProofKey: string;
      transferProofMime: string;
      transferProofUploadedAt: number;
    }
  | { error: string };

function validate(file: unknown): { file: File } | { error: string } {
  if (!(file instanceof File)) return { error: "No image provided." };
  if (!ALLOWED_MIMES.has(file.type)) {
    return { error: "Image must be JPEG, PNG, WebP, or HEIC." };
  }
  if (file.size > MAX_BYTES) return { error: "Image too large (max 5 MB)." };
  return { file };
}

export async function uploadTransferProof(
  formData: FormData,
): Promise<UploadTransferProofResult> {
  const v = validate(formData.get("image"));
  if ("error" in v) return v;

  const billId = formData.get("billId");
  const participantId = formData.get("participantId");
  if (typeof billId !== "string" || typeof participantId !== "string") {
    return { error: "Missing bill or participant id." };
  }
  if (!/^[A-Za-z0-9_-]+$/.test(billId) || !/^[A-Za-z0-9_-]+$/.test(participantId)) {
    return { error: "Invalid bill or participant id." };
  }

  // Use the real bill+participant ids in the key so admin can scope-list later.
  // If the participant isn't yet known (shouldn't happen — they tap their name
  // before reaching the form), fall back to a temp suffix.
  const safeBill = billId || `pending-${nanoid(8)}`;
  const safePid = participantId || `unknown-${nanoid(8)}`;
  const bytes = new Uint8Array(await v.file.arrayBuffer());

  try {
    const { env } = getCloudflareContext();
    const { key } = await uploadTransferProofToR2(
      env.RECEIPTS,
      safeBill,
      safePid,
      bytes,
      v.file.type,
    );
    return {
      transferProofKey: key,
      transferProofMime: v.file.type,
      transferProofUploadedAt: Math.floor(Date.now() / 1000),
    };
  } catch (err) {
    console.error("[transfer] upload failed:", err);
    return { error: "Couldn't save the transfer screenshot — try again." };
  }
}

export async function deleteTransferProof(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const key = formData.get("key");
  if (typeof key !== "string" || !TRANSFER_KEY_PATTERN.test(key)) {
    return { error: "Invalid transfer-proof key." };
  }
  try {
    const { env } = getCloudflareContext();
    await deleteReceiptFromR2(env.RECEIPTS, key);
    return { ok: true };
  } catch (err) {
    console.error("[transfer] delete failed:", err);
    return { error: "Couldn't delete the transfer screenshot." };
  }
}
