import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { getBillPublic } from "@/lib/bills/read";
import { streamReceiptFromR2 } from "@/lib/receipts/storage";

type RouteContext = { params: Promise<{ billId: string }> };

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const { billId } = await params;

  const bill = await getBillPublic(getDb(), billId);
  if (!bill || !bill.receiptKey) {
    return new Response(null, { status: 404 });
  }

  const { env } = getCloudflareContext();
  const obj = await streamReceiptFromR2(env.RECEIPTS, bill.receiptKey);
  if (!obj) {
    // R2 lifecycle has auto-deleted the object (past 7-day TTL).
    return new Response(null, { status: 410 });
  }

  return new Response(obj.body, {
    headers: {
      "content-type": obj.contentType ?? bill.receiptMime ?? "image/jpeg",
      "cache-control": "private, max-age=300",
    },
  });
}
