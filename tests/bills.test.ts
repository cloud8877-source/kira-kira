import { describe, expect, it } from "vitest";
import { AdminUnauthorizedError } from "@/lib/auth";
import { createBillImpl } from "@/lib/bills/create";
import { getBillAdmin, getBillPublic } from "@/lib/bills/read";
import { makeTestDb } from "./_helpers/db";

const createInput = {
  title: "Nasi lemak table",
  totalCents: 6000,
  participants: [{ name: "Amin" }, { name: "Bee" }, { name: "Chong" }],
};

describe("bill creation and reads", () => {
  it("creates a bill with equal participant shares and a one-time admin token", async () => {
    const db = await makeTestDb();

    const result = await createBillImpl(db, createInput);
    const bill = await getBillPublic(db, result.id);

    expect(result.adminSecret).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(bill).toMatchObject({
      id: result.id,
      title: "Nasi lemak table",
      totalCents: 6000,
      progress: 0,
    });
    expect(bill?.participants).toHaveLength(3);
    expect(bill?.participants.map((participant) => participant.amountCents)).toEqual([
      2000, 2000, 2000,
    ]);
  });

  it("returns admin reads only when the token verifies", async () => {
    const db = await makeTestDb();
    const result = await createBillImpl(db, createInput);

    await expect(getBillAdmin(db, result.id, result.adminSecret)).resolves.toMatchObject({
      id: result.id,
      participants: expect.any(Array),
    });
    await expect(getBillAdmin(db, result.id, "wrong-token")).rejects.toBeInstanceOf(
      AdminUnauthorizedError,
    );
  });
});
