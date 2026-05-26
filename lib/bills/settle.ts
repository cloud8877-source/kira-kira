import { eq } from "drizzle-orm";
import { bills, participants } from "@/db/schema";
import { AdminUnauthorizedError, verifySecret } from "@/lib/auth";
import {
  deleteAllByPrefix,
  type R2BucketLike,
} from "@/lib/receipts/storage";
import type { Db } from "./read";
import { registerCascadeDeleteHook } from "./read";

const SECONDS_PER_DAY = 86400;

async function ensureAdmin(db: Db, billId: string, adminSecret: string) {
  const rows = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
  const bill = rows[0];
  if (!bill) throw new AdminUnauthorizedError();
  const verified = await verifySecret(adminSecret, bill.adminSecretHash);
  if (!verified) throw new AdminUnauthorizedError();
  return bill;
}

export class NotAllPaidError extends Error {
  constructor() {
    super("Not all participants are marked paid yet.");
    this.name = "NotAllPaidError";
  }
}

export async function markBillSettledImpl(
  db: Db,
  billId: string,
  adminSecret: string,
): Promise<{ settledAt: Date }> {
  await ensureAdmin(db, billId, adminSecret);
  const ps = await db.select().from(participants).where(eq(participants.billId, billId));
  if (ps.length === 0 || ps.some((p) => p.status !== "paid")) {
    throw new NotAllPaidError();
  }
  const now = new Date();
  await db.update(bills).set({ settledAt: now }).where(eq(bills.id, billId));
  return { settledAt: now };
}

export async function scheduleBillExpiryImpl(
  db: Db,
  billId: string,
  adminSecret: string,
  retentionDays: number,
): Promise<{ expiresAt: Date }> {
  await ensureAdmin(db, billId, adminSecret);
  const expiresAt = new Date(Date.now() + retentionDays * SECONDS_PER_DAY * 1000);
  await db.update(bills).set({ expiresAt }).where(eq(bills.id, billId));
  return { expiresAt };
}

// Cascade-delete: removes all R2 objects under the bill's prefixes, then
// deletes the bill row (ON DELETE CASCADE drops participants via FK).
export async function deleteBillCascadeImpl(
  db: Db,
  billId: string,
  bucket: R2BucketLike | null,
): Promise<void> {
  if (bucket) {
    await Promise.allSettled([
      deleteAllByPrefix(bucket, `receipts/${billId}/`),
      deleteAllByPrefix(bucket, `payments/${billId}/`),
      deleteAllByPrefix(bucket, `transfers/${billId}/`),
    ]);
  }
  await db.delete(bills).where(eq(bills.id, billId));
}

export async function deleteBillImpl(
  db: Db,
  billId: string,
  adminSecret: string,
  bucket: R2BucketLike | null,
): Promise<void> {
  await ensureAdmin(db, billId, adminSecret);
  await deleteBillCascadeImpl(db, billId, bucket);
}

// Hook registration so lib/bills/read.ts can cascade-delete on lazy expiry
// without importing this module (avoids circular dependency).
// The hook only knows about D1 — R2 cleanup happens via the 7-day lifecycle
// rule anyway, so a missed R2 wipe is bounded.
registerCascadeDeleteHook(async (db, billId) => {
  await deleteBillCascadeImpl(db, billId, null);
});
