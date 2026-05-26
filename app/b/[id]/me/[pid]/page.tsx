import { notFound } from "next/navigation";
import { BillReceipt } from "@/components/BillReceipt";
import { MarkPaidForm } from "@/components/MarkPaidForm";
import { getDb } from "@/db";
import { getBillPublic } from "@/lib/bills/read";
import { formatRm } from "@/lib/money";

type MemberConfirmPageProps = {
  params: Promise<{
    id: string;
    pid: string;
  }>;
};

export default async function MemberConfirmPage({ params }: MemberConfirmPageProps) {
  const { id, pid } = await params;
  const bill = await getBillPublic(getDb(), id);

  if (!bill) {
    notFound();
  }

  const participant = bill.participants.find((billParticipant) => billParticipant.id === pid);

  if (!participant) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:py-10">
      <section className="mx-auto flex w-full max-w-md flex-col gap-8 pb-8 sm:max-w-lg">
        <BillReceipt bill={bill} />

        <section className="space-y-4" aria-labelledby="payment-confirm-title">
          <div className="space-y-1">
            <p className="font-mono text-xs font-semibold uppercase text-teh">Your share</p>
            <h2
              className="font-display text-2xl font-semibold leading-tight text-ink"
              id="payment-confirm-title"
            >
              {participant.name}, you owe {formatRm(participant.amountCents)}
            </h2>
          </div>

          <MarkPaidForm
            billId={id}
            initialStatus={participant.status}
            participantId={participant.id}
            paymentQrSrc={bill.paymentQrKey ? `/api/payments/${id}/qr` : null}
            paymentInstructions={bill.paymentInstructions}
          />

          <noscript>
            <p className="rounded-lg border border-sambal/30 bg-sambal/10 px-3 py-2 text-sm text-sambal">
              Enable JavaScript to mark this paid.
            </p>
          </noscript>
        </section>
      </section>
    </main>
  );
}
