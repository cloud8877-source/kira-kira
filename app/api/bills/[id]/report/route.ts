import { getDb } from "@/db";
import { AdminUnauthorizedError } from "@/lib/auth";
import { getBillAdmin } from "@/lib/bills/read";

type RouteContext = { params: Promise<{ id: string }> };

// Old bills created before the schema migration to JS-side timestamps may
// have text created_at values that Drizzle reads back as Invalid Date.
// Guard every .toISOString() call.
function safeIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  const t = value.getTime();
  if (Number.isNaN(t)) return null;
  return value.toISOString();
}

export async function GET(req: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  const k = new URL(req.url).searchParams.get("k");
  if (!k) return new Response(null, { status: 404 });

  try {
    const bill = await getBillAdmin(getDb(), id, k);
    return Response.json({
      bill: {
        id: bill.id,
        title: bill.title,
        totalCents: bill.totalCents,
        currency: bill.currency,
        dueDate: safeIso(bill.dueDate),
        description: bill.description,
        createdAt: safeIso(bill.createdAt),
        settledAt: safeIso(bill.settledAt),
        expiresAt: safeIso(bill.expiresAt),
        hasReceipt: Boolean(bill.receiptKey),
        hasPaymentQr: Boolean(bill.paymentQrKey),
        paymentInstructions: bill.paymentInstructions,
        progress: bill.progress,
      },
      participants: bill.participants.map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        amountCents: p.amountCents,
        status: p.status,
        note: p.note,
        paidAt: safeIso(p.paidAt),
        confirmedAt: safeIso(p.confirmedAt),
        hasTransferProof: Boolean(p.transferProofKey),
      })),
    });
  } catch (err) {
    if (err instanceof AdminUnauthorizedError) return new Response(null, { status: 404 });
    console.error("[report] failed:", err instanceof Error ? err.stack ?? err.message : String(err));
    return new Response(null, { status: 500 });
  }
}
