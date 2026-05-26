import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { AdminUnauthorizedError } from "@/lib/auth";
import { getBillAdmin } from "@/lib/bills/read";
import { streamReceiptFromR2 } from "@/lib/receipts/storage";

type RouteContext = { params: Promise<{ billId: string; pid: string }> };

export async function GET(req: Request, { params }: RouteContext): Promise<Response> {
  const { billId, pid } = await params;
  const k = new URL(req.url).searchParams.get("k");
  if (!k) return new Response(null, { status: 404 });

  try {
    const bill = await getBillAdmin(getDb(), billId, k);
    const participant = bill.participants.find((p) => p.id === pid);
    if (!participant?.transferProofKey) {
      return new Response(null, { status: 404 });
    }
    const { env } = getCloudflareContext();
    const obj = await streamReceiptFromR2(env.RECEIPTS, participant.transferProofKey);
    if (!obj) return new Response(null, { status: 410 });
    return new Response(obj.body, {
      headers: {
        "content-type": obj.contentType ?? participant.transferProofMime ?? "image/jpeg",
        "cache-control": "private, max-age=300",
      },
    });
  } catch (err) {
    if (err instanceof AdminUnauthorizedError) return new Response(null, { status: 404 });
    return new Response(null, { status: 500 });
  }
}
