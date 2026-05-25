import { asc, eq } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "@/db/schema";
import { bills, participants, type Bill, type Participant } from "@/db/schema";
import { AdminUnauthorizedError, verifySecret } from "@/lib/auth";

export type Db = BaseSQLiteDatabase<"async", unknown, typeof schema>;

const PERCENT_COMPLETE = 100;

export type BillView = Omit<Bill, "adminSecretHash"> & {
  progress: number;
  participants: Participant[];
};

function progressFor(participantRows: Participant[]): number {
  if (participantRows.length < 1) {
    return 0;
  }

  const paidCount = participantRows.filter((participant) => participant.status === "paid").length;
  return Math.round((paidCount * PERCENT_COMPLETE) / participantRows.length);
}

async function getBillRow(db: Db, billId: string): Promise<Bill | null> {
  const rows = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
  return rows[0] ?? null;
}

async function getParticipants(db: Db, billId: string): Promise<Participant[]> {
  return db
    .select()
    .from(participants)
    .where(eq(participants.billId, billId))
    .orderBy(asc(participants.name));
}

function toBillView(bill: Bill, participantRows: Participant[]): BillView {
  const { adminSecretHash: _adminSecretHash, ...publicBill } = bill;
  return {
    ...publicBill,
    participants: participantRows,
    progress: progressFor(participantRows),
  };
}

export async function getBillPublic(db: Db, billId: string): Promise<BillView | null> {
  const bill = await getBillRow(db, billId);
  if (!bill) {
    return null;
  }

  return toBillView(bill, await getParticipants(db, billId));
}

export async function getBillAdmin(
  db: Db,
  billId: string,
  adminSecret: string,
): Promise<BillView> {
  const bill = await getBillRow(db, billId);
  if (!bill) {
    throw new AdminUnauthorizedError();
  }

  const verified = await verifySecret(adminSecret, bill.adminSecretHash);
  if (!verified) {
    throw new AdminUnauthorizedError();
  }

  return toBillView(bill, await getParticipants(db, billId));
}
