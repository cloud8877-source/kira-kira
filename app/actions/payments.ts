"use server";

import { getDb } from "@/db";
import { confirmPaymentImpl } from "@/lib/payments/confirm";
import { markPaidImpl } from "@/lib/payments/mark";
import { rejectPaymentImpl } from "@/lib/payments/reject";
import {
  confirmPaymentSchema,
  markPaidSchema,
  rejectPaymentSchema,
  type ConfirmPaymentInput,
  type MarkPaidInput,
  type RejectPaymentInput,
} from "@/lib/validation";

export async function markPaid(input: MarkPaidInput) {
  const parsed = markPaidSchema.parse(input);
  return markPaidImpl(getDb(), parsed.billId, parsed.participantId, parsed.note);
}

export async function confirmPayment(input: ConfirmPaymentInput) {
  const parsed = confirmPaymentSchema.parse(input);
  return confirmPaymentImpl(getDb(), parsed.billId, parsed.participantId, parsed.adminSecret);
}

export async function rejectPayment(input: RejectPaymentInput) {
  const parsed = rejectPaymentSchema.parse(input);
  return rejectPaymentImpl(getDb(), parsed.billId, parsed.participantId, parsed.adminSecret);
}
