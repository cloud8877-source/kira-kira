import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BillReceipt } from "@/components/BillReceipt";
import { ParticipantPicker } from "@/components/ParticipantPicker";
import { PaymentMethodCard } from "@/components/PaymentMethodCard";
import { PrintInAnimation } from "@/components/PrintInAnimation";
import { ReceiptPreview } from "@/components/ReceiptPreview";
import { getDb } from "@/db";
import { getBillPublic } from "@/lib/bills/read";
import { formatRm } from "@/lib/money";

type PublicBillPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const bill = await getBillPublic(getDb(), id);
  if (!bill) return { title: "Kira-Kira" };
  return {
    title: `${bill.title} — Kira-Kira`,
    description: `Split bill: ${formatRm(bill.totalCents)} across ${bill.participants.length} people.`,
    openGraph: {
      title: bill.title,
      description: `Split bill: ${formatRm(bill.totalCents)} across ${bill.participants.length} people.`,
      images: [{ url: `/og.png`, width: 1200, height: 630, alt: `${bill.title} — Kira-Kira` }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: bill.title,
      images: [`/og.png`],
    },
  };
}

export default async function PublicBillPage({ params }: PublicBillPageProps) {
  const { id } = await params;
  const bill = await getBillPublic(getDb(), id);

  if (!bill) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:py-10">
      <section className="mx-auto flex w-full max-w-md flex-col gap-8 pb-8 sm:max-w-lg">
        <PrintInAnimation>
          <BillReceipt bill={bill} />
        </PrintInAnimation>

        {bill.paymentQrKey || bill.paymentInstructions ? (
          <PaymentMethodCard
            qrSrc={bill.paymentQrKey ? `/api/payments/${id}/qr` : null}
            instructions={bill.paymentInstructions}
          />
        ) : null}

        {bill.receiptKey ? (
          <ReceiptPreview
            src={`/api/receipts/${id}`}
            uploadedAt={bill.receiptUploadedAt}
            label="Original receipt from the organizer"
          />
        ) : null}

        <ParticipantPicker billId={id} participants={bill.participants} />
      </section>
    </main>
  );
}
