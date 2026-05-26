import { describe, expect, it } from "vitest";
import {
  buildReceiptKey,
  deleteReceiptFromR2,
  streamReceiptFromR2,
  uploadReceiptToR2,
  type R2BucketLike,
} from "@/lib/receipts/storage";

function makeStubBucket() {
  const store = new Map<string, { value: unknown; contentType?: string }>();
  const calls: { put: number; get: number; delete: number; list: number } = {
    put: 0,
    get: 0,
    delete: 0,
    list: 0,
  };
  const bucket: R2BucketLike = {
    async put(key, value, options) {
      calls.put += 1;
      store.set(key, { value, contentType: options?.httpMetadata?.contentType });
    },
    async get(key) {
      calls.get += 1;
      const hit = store.get(key);
      if (!hit) return null;
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(0));
          controller.close();
        },
      });
      return { body, httpMetadata: { contentType: hit.contentType } };
    },
    async delete(keyOrKeys) {
      calls.delete += 1;
      const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
      for (const k of keys) store.delete(k);
    },
    async list(options) {
      calls.list += 1;
      const prefix = options?.prefix ?? "";
      return {
        objects: Array.from(store.keys())
          .filter((k) => k.startsWith(prefix))
          .map((key) => ({ key })),
      };
    },
  };
  return { bucket, store, calls };
}

describe("buildReceiptKey", () => {
  it("produces a key of the form receipts/<billId>/<nanoid>.<ext>", () => {
    const key = buildReceiptKey("abc123", "image/jpeg");
    expect(key).toMatch(/^receipts\/abc123\/[A-Za-z0-9_-]{8}\.jpg$/u);
  });

  it("maps mime types to known extensions and falls back to .bin", () => {
    expect(buildReceiptKey("b", "image/png")).toMatch(/\.png$/);
    expect(buildReceiptKey("b", "image/webp")).toMatch(/\.webp$/);
    expect(buildReceiptKey("b", "image/heic")).toMatch(/\.heic$/);
    expect(buildReceiptKey("b", "image/heif")).toMatch(/\.heif$/);
    expect(buildReceiptKey("b", "application/octet-stream")).toMatch(/\.bin$/);
  });
});

describe("buildPaymentQrKey / buildTransferProofKey", () => {
  it("uses payments/ and transfers/ prefixes correctly", async () => {
    const { buildPaymentQrKey, buildTransferProofKey } = await import("@/lib/receipts/storage");
    expect(buildPaymentQrKey("bill1", "image/png")).toMatch(
      /^payments\/bill1\/[A-Za-z0-9_-]{8}\.png$/u,
    );
    expect(buildTransferProofKey("bill1", "p1", "image/jpeg")).toMatch(
      /^transfers\/bill1\/p1\/[A-Za-z0-9_-]{8}\.jpg$/u,
    );
  });
});

describe("deleteAllByPrefix", () => {
  it("removes every object under the prefix and returns the count", async () => {
    const { deleteAllByPrefix } = await import("@/lib/receipts/storage");
    const { bucket, store } = makeStubBucket();
    await bucket.put("receipts/billX/a.jpg", new Uint8Array());
    await bucket.put("receipts/billX/b.jpg", new Uint8Array());
    await bucket.put("payments/billX/qr.png", new Uint8Array());
    await bucket.put("transfers/billX/p1/z.jpg", new Uint8Array());
    const removed = await deleteAllByPrefix(bucket, "receipts/billX/");
    expect(removed).toBe(2);
    expect(store.has("receipts/billX/a.jpg")).toBe(false);
    expect(store.has("payments/billX/qr.png")).toBe(true);
  });
});

describe("uploadReceiptToR2", () => {
  it("writes the bytes under the generated key and returns it", async () => {
    const { bucket, store, calls } = makeStubBucket();
    const bytes = new Uint8Array([0xff, 0xd8, 0xff]);
    const { key } = await uploadReceiptToR2(bucket, "bill42", bytes, "image/jpeg");

    expect(key.startsWith("receipts/bill42/")).toBe(true);
    expect(key.endsWith(".jpg")).toBe(true);
    expect(calls.put).toBe(1);
    expect(store.has(key)).toBe(true);
    expect(store.get(key)?.contentType).toBe("image/jpeg");
  });
});

describe("streamReceiptFromR2", () => {
  it("returns null when the key is missing", async () => {
    const { bucket } = makeStubBucket();
    const result = await streamReceiptFromR2(bucket, "receipts/none/missing.jpg");
    expect(result).toBeNull();
  });

  it("returns body + content-type when the object exists", async () => {
    const { bucket } = makeStubBucket();
    const { key } = await uploadReceiptToR2(
      bucket,
      "b",
      new Uint8Array([1, 2]),
      "image/png",
    );
    const result = await streamReceiptFromR2(bucket, key);
    expect(result).not.toBeNull();
    expect(result?.contentType).toBe("image/png");
    expect(result?.body).toBeInstanceOf(ReadableStream);
  });
});

describe("deleteReceiptFromR2", () => {
  it("forwards the key to bucket.delete and clears storage", async () => {
    const { bucket, store, calls } = makeStubBucket();
    const { key } = await uploadReceiptToR2(
      bucket,
      "b",
      new Uint8Array([1]),
      "image/jpeg",
    );
    await deleteReceiptFromR2(bucket, key);
    expect(calls.delete).toBe(1);
    expect(store.has(key)).toBe(false);
  });
});
