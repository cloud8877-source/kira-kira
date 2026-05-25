import { describe, expect, it } from "vitest";
import { generateAdminSecret, hashSecret, verifySecret } from "@/lib/auth";

describe("admin token auth", () => {
  it("generates a base64url token from 16 random bytes", () => {
    const adminSecret = generateAdminSecret();

    expect(adminSecret).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("hashes and verifies with timing-safe comparison", async () => {
    const adminSecret = generateAdminSecret();
    const storedHash = await hashSecret(adminSecret);

    await expect(verifySecret(adminSecret, storedHash)).resolves.toBe(true);
    await expect(verifySecret("wrong-token", storedHash)).resolves.toBe(false);
    expect(typeof crypto.subtle.timingSafeEqual).toBe("function");
  });
});
