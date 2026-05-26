import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { bills, participants } from "@/db/schema";
import {
  deleteBillCascadeImpl,
  markBillSettledImpl,
  NotAllPaidError,
  scheduleBillExpiryImpl,
} from "@/lib/bills/settle";
import { AdminUnauthorizedError } from "@/lib/auth";
import { createBillImpl } from "@/lib/bills/create";
import { markPaidImpl } from "@/lib/payments/mark";
import { confirmPaymentImpl } from "@/lib/payments/confirm";
import { makeTestDb } from "./_helpers/db";

async function setupBill(allPaid = false) {
  const db = await makeTestDb();
  const { id, adminSecret } = await createBillImpl(db, {
    title: "Friday lunch",
    totalCents: 6000,
    participants: [{ name: "A" }, { name: "B" }],
  } as Parameters<typeof createBillImpl>[1]);
  const ps = await db.select().from(participants).where(eq(participants.billId, id));
  if (allPaid) {
    for (const p of ps) {
      await markPaidImpl(db, id, p.id);
      await confirmPaymentImpl(db, id, p.id, adminSecret);
    }
  }
  return { db, id, adminSecret };
}

describe("markBillSettledImpl", () => {
  it("requires all participants to be paid", async () => {
    const { db, id, adminSecret } = await setupBill(false);
    await expect(markBillSettledImpl(db, id, adminSecret)).rejects.toBeInstanceOf(NotAllPaidError);
  });

  it("sets settledAt when all participants are paid", async () => {
    const { db, id, adminSecret } = await setupBill(true);
    const { settledAt } = await markBillSettledImpl(db, id, adminSecret);
    expect(settledAt).toBeInstanceOf(Date);
    const row = await db.select().from(bills).where(eq(bills.id, id)).limit(1);
    expect(row[0]?.settledAt).toBeInstanceOf(Date);
  });

  it("rejects wrong admin secret", async () => {
    const { db, id } = await setupBill(true);
    await expect(markBillSettledImpl(db, id, "nope")).rejects.toBeInstanceOf(AdminUnauthorizedError);
  });
});

describe("scheduleBillExpiryImpl", () => {
  it("sets expiresAt to now + retentionDays", async () => {
    const { db, id, adminSecret } = await setupBill(true);
    const before = Date.now();
    const { expiresAt } = await scheduleBillExpiryImpl(db, id, adminSecret, 7);
    const ms = expiresAt.getTime() - before;
    // ~7 days in ms with generous tolerance for test runtime jitter
    expect(ms).toBeGreaterThan(7 * 86400000 - 5000);
    expect(ms).toBeLessThan(7 * 86400000 + 5000);
  });

  it("rejects wrong admin secret", async () => {
    const { db, id } = await setupBill(true);
    await expect(scheduleBillExpiryImpl(db, id, "nope", 7)).rejects.toBeInstanceOf(
      AdminUnauthorizedError,
    );
  });
});

describe("deleteBillCascadeImpl", () => {
  it("removes the bill and (via FK cascade) participants", async () => {
    const { db, id } = await setupBill(false);
    await deleteBillCascadeImpl(db, id, null);
    const remainingBill = await db.select().from(bills).where(eq(bills.id, id)).limit(1);
    expect(remainingBill).toHaveLength(0);
    const remainingPs = await db.select().from(participants).where(eq(participants.billId, id));
    expect(remainingPs).toHaveLength(0);
  });
});
