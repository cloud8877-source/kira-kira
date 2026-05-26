import { nanoid } from "nanoid";

// Minimal R2Bucket-shaped interface so unit tests can stub without
// importing the full @cloudflare/workers-types surface.
type MinimalR2Bucket = {
  put: (
    key: string,
    value: ArrayBuffer | Uint8Array | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>;
  get: (key: string) => Promise<{
    body: ReadableStream;
    httpMetadata?: { contentType?: string };
  } | null>;
  delete: (key: string) => Promise<void>;
};

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

function extForMime(mime: string): string {
  return MIME_TO_EXT[mime.toLowerCase()] ?? "bin";
}

export function buildReceiptKey(billId: string, mime: string): string {
  return `receipts/${billId}/${nanoid(8)}.${extForMime(mime)}`;
}

export async function uploadReceiptToR2(
  bucket: MinimalR2Bucket,
  billId: string,
  bytes: Uint8Array,
  mime: string,
): Promise<{ key: string }> {
  const key = buildReceiptKey(billId, mime);
  await bucket.put(key, bytes, { httpMetadata: { contentType: mime } });
  return { key };
}

export async function streamReceiptFromR2(
  bucket: MinimalR2Bucket,
  key: string,
): Promise<{ body: ReadableStream; contentType: string | undefined } | null> {
  const obj = await bucket.get(key);
  if (!obj) return null;
  return { body: obj.body, contentType: obj.httpMetadata?.contentType };
}

export async function deleteReceiptFromR2(
  bucket: MinimalR2Bucket,
  key: string,
): Promise<void> {
  await bucket.delete(key);
}

export type R2BucketLike = MinimalR2Bucket;
