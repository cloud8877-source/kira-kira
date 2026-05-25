"use server";

import { getDb } from "@/db";
import { createBillImpl } from "@/lib/bills/create";
import { createBillSchema, type CreateBillInput } from "@/lib/validation";

export async function createBill(input: CreateBillInput) {
  const parsed = createBillSchema.parse(input);
  return createBillImpl(getDb(), parsed);
}
