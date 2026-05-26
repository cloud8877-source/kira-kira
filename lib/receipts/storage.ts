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
  delete: (key: string | string[]) => Promise<void>;
  list: (options?: { prefix?: string; cursor?: string }) => Promise<{
    objects: Array<{ key: string }>;
    truncated?: boolean;
    cursor?: string;
  }>;
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

export function buildPaymentQrKey(billId: string, mime: string): string {
  return `payments/${billId}/${nanoid(8)}.${extForMime(mime)}`;
}

export function buildTransferProofKey(
  billId: string,
  participantId: string,
  mime: string,
): string {
  return `transfers/${billId}/${participantId}/${nanoid(8)}.${extForMime(mime)}`;
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

export async function uploadPaymentQrToR2(
  bucket: MinimalR2Bucket,
  billId: string,
  bytes: Uint8Array,
  mime: string,
): Promise<{ key: string }> {
  const key = buildPaymentQrKey(billId, mime);
  await bucket.put(key, bytes, { httpMetadata: { contentType: mime } });
  return { key };
}

export async function uploadTransferProofToR2(
  bucket: MinimalR2Bucket,
  billId: string,
  participantId: string,
  bytes: Uint8Array,
  mime: string,
): Promise<{ key: string }> {
  const key = buildTransferProofKey(billId, participantId, mime);
  await bucket.put(key, bytes, { httpMetadata: { contentType: mime } });
  return { key };
}

// Lists every object under a prefix and deletes them in batches.
// Used during cascade-delete when a bill is removed.
export async function deleteAllByPrefix(
  bucket: MinimalR2Bucket,
  prefix: string,
): Promise<number> {
  let removed = 0;
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor });
    if (page.objects.length === 0) break;
    const keys = page.objects.map((o) => o.key);
    await bucket.delete(keys);
    removed += keys.length;
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return removed;
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
