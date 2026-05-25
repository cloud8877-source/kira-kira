import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cache } from "react";
import * as schema from "./schema";

export const getDb = cache(() => {
  const { env } = getCloudflareContext();
  return drizzle(env.DB, { schema });
});

export const getDbAsync = cache(async () => {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
});

export { schema };
