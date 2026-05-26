import { nanoid } from "nanoid";
import { bills, participants } from "@/db/schema";
import { generateAdminSecret, hashSecret } from "@/lib/auth";
import type { CreateBillInput } from "@/lib/validation";
import type { Db } from "./read";

export type CreateBillResult = {
  id: string;
  adminSecret: string;
};

function participantShares(totalCents: number, count: number): number[] {
  const baseShare = Math.floor(totalCents / count);
  const remainder = totalCents % count;

  return Array.from({ length: count }, (_, index) => baseShare + (index < remainder ? 1 : 0));
}

export async function createBillImpl(
  db: Db,
  input: CreateBillInput,
): Promise<CreateBillResult> {
  const id = nanoid(10);
  const adminSecret = generateAdminSecret();
  const adminSecretHash = await hashSecret(adminSecret);
  const shares = participantShares(input.totalCents, input.participants.length);

  await db.insert(bills).values({
    id,
    title: input.title,
    totalCents: input.totalCents,
    dueDate: input.dueDate,
    description: input.description,
    adminSecretHash,
    receiptKey: input.receiptKey ?? null,
    receiptMime: input.receiptMime ?? null,
    receiptUploadedAt: input.receiptUploadedAt ? new Date(input.receiptUploadedAt * 1000) : null,
  });

  await db.insert(participants).values(
    input.participants.map((participant, index) => ({
      id: nanoid(8),
      billId: id,
      name: participant.name,
      phone: participant.phone,
      amountCents: shares[index],
    })),
  );

  return { id, adminSecret };
}
