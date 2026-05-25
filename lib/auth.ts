declare global {
  interface SubtleCrypto {
    timingSafeEqual(left: ArrayBufferView, right: ArrayBufferView): boolean;
  }
}

export class AdminUnauthorizedError extends Error {
  constructor() {
    super("Admin token is invalid or missing");
    this.name = "AdminUnauthorizedError";
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized.padEnd(normalized.length + paddingLength, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function viewBytes(view: ArrayBufferView): Uint8Array {
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

function ensureTimingSafeEqual() {
  if (typeof crypto.subtle.timingSafeEqual === "function") {
    return;
  }

  Object.defineProperty(crypto.subtle, "timingSafeEqual", {
    configurable: true,
    value(left: ArrayBufferView, right: ArrayBufferView) {
      const leftBytes = viewBytes(left);
      const rightBytes = viewBytes(right);
      let diff = leftBytes.byteLength ^ rightBytes.byteLength;
      const length = Math.max(leftBytes.byteLength, rightBytes.byteLength);

      for (let index = 0; index < length; index += 1) {
        diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
      }

      return diff === 0;
    },
  });
}

async function sha256Bytes(value: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return new Uint8Array(digest);
}

export function generateAdminSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function hashSecret(adminSecret: string): Promise<string> {
  return bytesToBase64Url(await sha256Bytes(adminSecret));
}

export async function verifySecret(adminSecret: string, storedHash: string): Promise<boolean> {
  let expectedBytes: Uint8Array;
  try {
    expectedBytes = base64UrlToBytes(storedHash);
  } catch {
    return false;
  }

  const actualBytes = await sha256Bytes(adminSecret);
  if (actualBytes.byteLength !== expectedBytes.byteLength) {
    return false;
  }

  ensureTimingSafeEqual();
  return crypto.subtle.timingSafeEqual(actualBytes, expectedBytes);
}
