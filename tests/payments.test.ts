import { describe, expect, it } from "vitest";
import { AdminUnauthorizedError } from "@/lib/auth";
import { createBillImpl } from "@/lib/bills/create";
import { getBillPublic } from "@/lib/bills/read";
import { confirmPaymentImpl } from "@/lib/payments/confirm";
import { markPaidImpl } from "@/lib/payments/mark";
import { rejectPaymentImpl } from "@/lib/payments/reject";
import { makeTestDb } from "./_helpers/db";

async function makeBill() {
  const db = await makeTestDb();
  const result = await createBillImpl(db, {
    title: "RM 60 supper",
    totalCents: 6000,
    participants: [{ name: "Amin" }, { name: "Bee" }, { name: "Chong" }],
  });
  const bill = await getBillPublic(db, result.id);
  if (!bill) throw new Error("Expected test bill to exist");
  return { db, result, firstParticipantId: bill.participants[0].id };
}

describe("payment flow", () => {
  it("supports create bill, mark paid, confirm, and progress updates", async () => {
    const { db, result, firstParticipantId } = await makeBill();

    await markPaidImpl(db, result.id, firstParticipantId, "Maybank ref 12345");
    const pendingBill = await getBillPublic(db, result.id);

    expect(pendingBill?.participants[0]).toMatchObject({
      id: firstParticipantId,
      status: "pending",
      note: "Maybank ref 12345",
    });

    await confirmPaymentImpl(db, result.id, firstParticipantId, result.adminSecret);
    const paidBill = await getBillPublic(db, result.id);

    expect(paidBill?.participants[0]).toMatchObject({
      id: firstParticipantId,
      status: "paid",
    });
    expect(paidBill?.progress).toBe(33);
  });

  it("throws AdminUnauthorizedError for wrong confirm or reject token", async () => {
    const { db, result, firstParticipantId } = await makeBill();
    await markPaidImpl(db, result.id, firstParticipantId);

    await expect(
      confirmPaymentImpl(db, result.id, firstParticipantId, "wrong-token"),
    ).rejects.toBeInstanceOf(AdminUnauthorizedError);

    await expect(
      rejectPaymentImpl(db, result.id, firstParticipantId, "wrong-token"),
    ).rejects.toBeInstanceOf(AdminUnauthorizedError);
  });

  it("keeps markPaid idempotent for pending and paid participants", async () => {
    const { db, result, firstParticipantId } = await makeBill();

    await markPaidImpl(db, result.id, firstParticipantId, "first");
    await markPaidImpl(db, result.id, firstParticipantId, "second");
    let bill = await getBillPublic(db, result.id);
    expect(bill?.participants[0]).toMatchObject({
      status: "pending",
      note: "first",
    });

    await confirmPaymentImpl(db, result.id, firstParticipantId, result.adminSecret);
    await markPaidImpl(db, result.id, firstParticipantId, "late note");
    bill = await getBillPublic(db, result.id);
    expect(bill?.participants[0]).toMatchObject({
      status: "paid",
      note: "first",
    });
  });

  it("rejects pending payment back to unpaid", async () => {
    const { db, result, firstParticipantId } = await makeBill();

    await markPaidImpl(db, result.id, firstParticipantId, "duplicate transfer");
    await rejectPaymentImpl(db, result.id, firstParticipantId, result.adminSecret);
    const bill = await getBillPublic(db, result.id);

    expect(bill?.participants[0]).toMatchObject({
      status: "unpaid",
      note: null,
      paidAt: null,
    });
  });
});
