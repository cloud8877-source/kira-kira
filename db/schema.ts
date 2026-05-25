import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const bills = sqliteTable("bills", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  totalCents: integer("total_cents").notNull(),
  currency: text("currency").notNull().default("MYR"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  description: text("description"),
  adminSecretHash: text("admin_secret_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const participants = sqliteTable(
  "participants",
  {
    id: text("id").primaryKey(),
    billId: text("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    amountCents: integer("amount_cents").notNull(),
    status: text("status", { enum: ["unpaid", "pending", "paid"] })
      .notNull()
      .default("unpaid"),
    note: text("note"),
    paidAt: integer("paid_at", { mode: "timestamp" }),
    confirmedAt: integer("confirmed_at", { mode: "timestamp" }),
  },
  (t) => ({
    billIdx: index("participants_bill_idx").on(t.billId),
  }),
);

export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
