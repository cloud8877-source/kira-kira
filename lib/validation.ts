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

const optionalReceiptKey = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .regex(/^receipts\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.(jpg|png|webp|heic|heif|bin)$/u)
    .optional(),
);

const optionalMime = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .regex(/^image\/(jpeg|png|webp|heic|heif)$/u)
    .optional(),
);

const optionalEpochSeconds = z.preprocess(
  (value) => (value === null || value === undefined || value === "" ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

export const createBillSchema = z.object({
  title: z.string().trim().min(1).max(120),
  totalCents: z.number().int().positive(),
  dueDate: optionalDate,
  description: optionalText(500),
  participants: z.array(participantSchema).min(1).max(50),
  receiptKey: optionalReceiptKey,
  receiptMime: optionalMime,
  receiptUploadedAt: optionalEpochSeconds,
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
