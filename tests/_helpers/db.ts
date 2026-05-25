import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export async function makeTestDb() {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  const sql = readFileSync(resolve(__dirname, "../../drizzle/0000_init.sql"), "utf8");
  for (const stmt of sql.split("--> statement-breakpoint")) {
    const trimmed = stmt.trim();
    if (trimmed) await client.execute(trimmed);
  }
  return db;
}
