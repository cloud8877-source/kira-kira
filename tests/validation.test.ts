import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  confirmPaymentSchema,
  createBillSchema,
  markPaidSchema,
  rejectPaymentSchema,
} from "@/lib/validation";

const validCreateInput = {
  title: "Kopi run",
  totalCents: 6000,
  participants: [
    { name: "Amin", phone: "+60123456789" },
    { name: "Bee" },
    { name: "Chong" },
  ],
};

describe("validation schemas", () => {
  it("accepts valid bill creation input", () => {
    expect(createBillSchema.parse(validCreateInput)).toMatchObject(validCreateInput);
  });

  it("rejects invalid bill creation input with Zod errors", () => {
    expect(() =>
      createBillSchema.parse({ ...validCreateInput, totalCents: 0 }),
    ).toThrow(z.ZodError);

    expect(() =>
      createBillSchema.parse({
        ...validCreateInput,
        participants: Array.from({ length: 51 }, (_, index) => ({
          name: `Person ${index}`,
        })),
      }),
    ).toThrow(z.ZodError);

    expect(() =>
      createBillSchema.parse({
        ...validCreateInput,
        participants: [{ name: "x".repeat(65) }],
      }),
    ).toThrow(z.ZodError);

    expect(() =>
      createBillSchema.parse({
        ...validCreateInput,
        participants: [{ name: "Amin", phone: "not-a-phone" }],
      }),
    ).toThrow(z.ZodError);
  });

  it("coerces empty optional fields to undefined", () => {
    const parsed = createBillSchema.parse({
      ...validCreateInput,
      description: "   ",
      dueDate: "",
      participants: [{ name: "Amin", phone: "  " }],
    });
    expect(parsed.description).toBeUndefined();
    expect(parsed.dueDate).toBeUndefined();
    expect(parsed.participants[0].phone).toBeUndefined();
  });

  it("passes through null and undefined optional dates", () => {
    const parsedNull = createBillSchema.parse({ ...validCreateInput, dueDate: null });
    const parsedUndef = createBillSchema.parse({ ...validCreateInput, dueDate: undefined });
    expect(parsedNull.dueDate).toBeUndefined();
    expect(parsedUndef.dueDate).toBeUndefined();
  });

  it("treats empty mark-paid note as undefined", () => {
    const parsed = markPaidSchema.parse({
      billId: "bill-id",
      participantId: "participant-id",
      note: "   ",
    });
    expect(parsed.note).toBeUndefined();
  });

  it("validates payment action inputs", () => {
    expect(
      markPaidSchema.parse({
        billId: "bill-id",
        participantId: "participant-id",
        note: "Maybank ref 12345",
      }),
    ).toMatchObject({ billId: "bill-id" });

    expect(
      confirmPaymentSchema.parse({
        billId: "bill-id",
        participantId: "participant-id",
        adminSecret: "secret",
      }),
    ).toMatchObject({ participantId: "participant-id" });

    expect(
      rejectPaymentSchema.parse({
        billId: "bill-id",
        participantId: "participant-id",
        adminSecret: "secret",
      }),
    ).toMatchObject({ adminSecret: "secret" });
  });
});

describe("server action boundaries", () => {
  it("Zod-parses createBill input before delegating", async () => {
    const createBillImpl = vi.fn(async () => ({
      id: "bill-id",
      adminSecret: "admin-secret",
    }));

    vi.resetModules();
    vi.doMock("@/db", () => ({ getDb: () => ({}) }));
    vi.doMock("@/lib/bills/create", () => ({ createBillImpl }));

    const { createBill } = await import("@/app/actions/bills");

    await expect(createBill(validCreateInput)).resolves.toEqual({
      id: "bill-id",
      adminSecret: "admin-secret",
    });
    expect(createBillImpl).toHaveBeenCalledWith({}, expect.objectContaining(validCreateInput));
    await expect(createBill({ ...validCreateInput, totalCents: 0 })).rejects.toThrow(
      z.ZodError,
    );
  });

  it("Zod-parses payment inputs before delegating", async () => {
    const markPaidImpl = vi.fn(async () => ({ ok: true }));
    const confirmPaymentImpl = vi.fn(async () => ({ ok: true }));
    const rejectPaymentImpl = vi.fn(async () => ({ ok: true }));

    vi.resetModules();
    vi.doMock("@/db", () => ({ getDb: () => ({}) }));
    vi.doMock("@/lib/payments/mark", () => ({ markPaidImpl }));
    vi.doMock("@/lib/payments/confirm", () => ({ confirmPaymentImpl }));
    vi.doMock("@/lib/payments/reject", () => ({ rejectPaymentImpl }));

    const { confirmPayment, markPaid, rejectPayment } = await import("@/app/actions/payments");

    await expect(
      markPaid({ billId: "bill-id", participantId: "participant-id" }),
    ).resolves.toEqual({ ok: true });
    await expect(
      confirmPayment({
        billId: "bill-id",
        participantId: "participant-id",
        adminSecret: "secret",
      }),
    ).resolves.toEqual({ ok: true });
    await expect(
      rejectPayment({
        billId: "bill-id",
        participantId: "participant-id",
        adminSecret: "secret",
      }),
    ).resolves.toEqual({ ok: true });

    await expect(
      markPaid({ billId: "", participantId: "participant-id" }),
    ).rejects.toThrow(z.ZodError);
  });
});
