import { and, eq } from "drizzle-orm";
import { participants, type Participant } from "@/db/schema";
import type { Db } from "@/lib/bills/read";

export type MarkPaidProof = {
  transferProofKey?: string | null;
  transferProofMime?: string | null;
  transferProofUploadedAt?: number | null; // epoch seconds
};

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
  proof?: MarkPaidProof,
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
      transferProofKey: proof?.transferProofKey ?? null,
      transferProofMime: proof?.transferProofMime ?? null,
      transferProofUploadedAt: proof?.transferProofUploadedAt
        ? new Date(proof.transferProofUploadedAt * 1000)
        : null,
    })
    .where(and(eq(participants.billId, billId), eq(participants.id, participantId)));

  return getParticipant(db, billId, participantId);
}
