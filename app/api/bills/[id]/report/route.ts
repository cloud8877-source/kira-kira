import { getDb } from "@/db";
import { AdminUnauthorizedError } from "@/lib/auth";
import { getBillAdmin } from "@/lib/bills/read";

type RouteContext = { params: Promise<{ id: string }> };

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
        dueDate: bill.dueDate?.toISOString() ?? null,
        description: bill.description,
        createdAt: bill.createdAt.toISOString(),
        settledAt: bill.settledAt?.toISOString() ?? null,
        expiresAt: bill.expiresAt?.toISOString() ?? null,
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
        paidAt: p.paidAt?.toISOString() ?? null,
        confirmedAt: p.confirmedAt?.toISOString() ?? null,
        hasTransferProof: Boolean(p.transferProofKey),
      })),
    });
  } catch (err) {
    if (err instanceof AdminUnauthorizedError) return new Response(null, { status: 404 });
    return new Response(null, { status: 500 });
  }
}
