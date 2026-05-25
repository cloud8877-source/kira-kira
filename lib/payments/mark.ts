import { and, eq } from "drizzle-orm";
import { participants, type Participant } from "@/db/schema";
import type { Db } from "@/lib/bills/read";

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

export async function markPaidImpl(
  db: Db,
  billId: string,
  participantId: string,
  note?: string,
): Promise<Participant | null> {
  const participant = await getParticipant(db, billId, participantId);
  if (!participant || participant.status !== "unpaid") {
    return participant;
  }

  await db
    .update(participants)
    .set({
      status: "pending",
      note,
      paidAt: new Date(),
    })
    .where(and(eq(participants.billId, billId), eq(participants.id, participantId)));

  return getParticipant(db, billId, participantId);
}
