import { eq } from "drizzle-orm";
import { bills } from "@/db/schema";
import { AdminUnauthorizedError, verifySecret } from "@/lib/auth";
import type { Db } from "./read";

export type PaymentMethodPatch = {
  paymentQrKey: string | null;
  paymentQrMime: string | null;
  paymentQrUploadedAt: Date | null;
  paymentInstructions: string | null;
};

export async function updateBillPaymentMethodImpl(
  db: Db,
  billId: string,
  adminSecret: string,
  patch: PaymentMethodPatch,
): Promise<void> {
  const rows = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
  const bill = rows[0];
  if (!bill) throw new AdminUnauthorizedError();
  const verified = await verifySecret(adminSecret, bill.adminSecretHash);
  if (!verified) throw new AdminUnauthorizedError();

  await db
    .update(bills)
    .set({
      paymentQrKey: patch.paymentQrKey,
      paymentQrMime: patch.paymentQrMime,
      paymentQrUploadedAt: patch.paymentQrUploadedAt,
      paymentInstructions: patch.paymentInstructions,
    })
    .where(eq(bills.id, billId));
}
