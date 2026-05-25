import { and, eq } from "drizzle-orm";
import { participants, type Participant } from "@/db/schema";
import { getBillAdmin, type Db } from "@/lib/bills/read";

async function getParticipant(
  db: Db,
  billId: string,
  participantId: string,
): Promise<Participant | null> {
  const rows = await db
    .select()
    .from(participants)
    .where(and(eq(participants.billId, billId), eq(participants.id, participantId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function rejectPaymentImpl(
  db: Db,
  billId: string,
  participantId: string,
  adminSecret: string,
): Promise<Participant | null> {
  await getBillAdmin(db, billId, adminSecret);

  await db
    .update(participants)
    .set({
      status: "unpaid",
      note: null,
      paidAt: null,
      confirmedAt: null,
    })
    .where(and(eq(participants.billId, billId), eq(participants.id, participantId)));

  return getParticipant(db, billId, participantId);
}
