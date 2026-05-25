import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const row = await env.DB.prepare("SELECT 1+1 AS value").first<{
      value: number;
    }>();
    return Response.json({ ok: true, result: row?.value ?? null });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
