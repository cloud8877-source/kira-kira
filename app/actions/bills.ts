"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { createBillImpl } from "@/lib/bills/create";
import {
  deleteBillImpl,
  markBillSettledImpl,
  NotAllPaidError,
  scheduleBillExpiryImpl,
} from "@/lib/bills/settle";
import { updateBillPaymentMethodImpl } from "@/lib/bills/update-payment";
import { AdminUnauthorizedError } from "@/lib/auth";
import {
  createBillSchema,
  deleteBillSchema,
  scheduleExpirySchema,
  settleBillSchema,
  updatePaymentMethodSchema,
  type CreateBillInput,
  type DeleteBillInput,
  type ScheduleExpiryInput,
  type SettleBillInput,
  type UpdatePaymentMethodInput,
} from "@/lib/validation";

export async function createBill(input: CreateBillInput) {
  const parsed = createBillSchema.parse(input);
  return createBillImpl(getDb(), parsed);
}

export type SettleResult =
  | { ok: true; settledAt: string }
  | { error: string };

export async function markBillSettled(input: SettleBillInput): Promise<SettleResult> {
  const parsed = settleBillSchema.parse(input);
  try {
    const { settledAt } = await markBillSettledImpl(
      getDb(),
      parsed.billId,
      parsed.adminSecret,
    );
    return { ok: true, settledAt: settledAt.toISOString() };
  } catch (err) {
    if (err instanceof AdminUnauthorizedError) return { error: "Unauthorized." };
    if (err instanceof NotAllPaidError) {
      return { error: "Not all participants are marked paid yet." };
    }
    console.error("[bill] settle failed:", err);
    return { error: "Couldn't mark settled." };
  }
}

export async function scheduleBillExpiry(
  input: ScheduleExpiryInput,
): Promise<{ ok: true; expiresAt: string } | { error: string }> {
  const parsed = scheduleExpirySchema.parse(input);
  try {
    const { expiresAt } = await scheduleBillExpiryImpl(
      getDb(),
      parsed.billId,
      parsed.adminSecret,
      parsed.retentionDays,
    );
    return { ok: true, expiresAt: expiresAt.toISOString() };
  } catch (err) {
    if (err instanceof AdminUnauthorizedError) return { error: "Unauthorized." };
    console.error("[bill] schedule-expiry failed:", err);
    return { error: "Couldn't schedule expiry." };
  }
}

export async function updateBillPaymentMethod(
  input: UpdatePaymentMethodInput,
): Promise<{ ok: true } | { error: string }> {
  const parsed = updatePaymentMethodSchema.parse(input);
  try {
    await updateBillPaymentMethodImpl(getDb(), parsed.billId, parsed.adminSecret, {
      paymentQrKey: parsed.paymentQrKey ?? null,
      paymentQrMime: parsed.paymentQrMime ?? null,
      paymentQrUploadedAt: parsed.paymentQrUploadedAt
        ? new Date(parsed.paymentQrUploadedAt * 1000)
        : null,
      paymentInstructions: parsed.paymentInstructions ?? null,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof AdminUnauthorizedError) return { error: "Unauthorized." };
    console.error("[bill] update-payment-method failed:", err);
    return { error: "Couldn't update the payment method." };
  }
}

export async function deleteBill(input: DeleteBillInput): Promise<{ ok: true } | { error: string }> {
  const parsed = deleteBillSchema.parse(input);
  try {
    const { env } = getCloudflareContext();
    await deleteBillImpl(getDb(), parsed.billId, parsed.adminSecret, env.RECEIPTS);
    return { ok: true };
  } catch (err) {
    if (err instanceof AdminUnauthorizedError) return { error: "Unauthorized." };
    console.error("[bill] delete failed:", err);
    return { error: "Couldn't delete the bill." };
  }
}
