import { z } from "zod";

const E164ISH_PHONE = /^\+?[1-9]\d{7,14}$/u;

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) => {
      if (typeof value === "string" && value.trim() === "") {
        return undefined;
      }
      return value;
    },
    z.string().trim().max(maxLength).optional(),
  );

const optionalPhone = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }
    return value;
  },
  z.string().trim().regex(E164ISH_PHONE, "Phone must be E.164-ish").optional(),
);

const optionalDate = z.preprocess(
  (value) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }
    return value;
  },
  z.coerce.date().optional(),
);

const participantSchema = z.object({
  name: z.string().trim().min(1).max(64),
  phone: optionalPhone,
});

const billIdSchema = z.string().trim().min(1);
const participantIdSchema = z.string().trim().min(1);

export const createBillSchema = z.object({
  title: z.string().trim().min(1).max(120),
  totalCents: z.number().int().positive(),
  dueDate: optionalDate,
  description: optionalText(500),
  participants: z.array(participantSchema).min(1).max(50),
});

export const markPaidSchema = z.object({
  billId: billIdSchema,
  participantId: participantIdSchema,
  note: optionalText(200),
});

export const confirmPaymentSchema = z.object({
  billId: billIdSchema,
  participantId: participantIdSchema,
  adminSecret: z.string().min(1),
});

export const rejectPaymentSchema = confirmPaymentSchema;

export type CreateBillInput = z.output<typeof createBillSchema>;
export type MarkPaidInput = z.output<typeof markPaidSchema>;
export type ConfirmPaymentInput = z.output<typeof confirmPaymentSchema>;
export type RejectPaymentInput = z.output<typeof rejectPaymentSchema>;
