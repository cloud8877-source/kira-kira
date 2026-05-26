import { notFound } from "next/navigation";
import { DashboardClient } from "@/components/DashboardClient";
import { PaymentMethodCard } from "@/components/PaymentMethodCard";
import { ReceiptPreview } from "@/components/ReceiptPreview";
import { getDb } from "@/db";
import { AdminUnauthorizedError } from "@/lib/auth";
import { getBillAdmin } from "@/lib/bills/read";

type AdminBillPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    k?: string | string[];
  }>;
};

function secretFromSearchParams(searchParams: { k?: string | string[] }) {
  return typeof searchParams.k === "string" ? searchParams.k : null;
}

export default async function AdminBillPage({ params, searchParams }: AdminBillPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const adminSecret = secretFromSearchParams(query);

  if (!adminSecret) {
    notFound();
  }

  try {
    const bill = await getBillAdmin(getDb(), id, adminSecret);

    return (
      <main className="min-h-screen px-4 py-6 sm:py-10">
        <DashboardClient adminSecret={adminSecret} billId={id} initialBill={bill} />
        {bill.paymentQrKey || bill.paymentInstructions ? (
          <section className="mx-auto mt-6 w-full max-w-md sm:max-w-lg">
            <PaymentMethodCard
              qrSrc={bill.paymentQrKey ? `/api/payments/${id}/qr` : null}
              instructions={bill.paymentInstructions}
            />
          </section>
        ) : null}
        {bill.receiptKey ? (
          <section className="mx-auto mt-6 w-full max-w-md sm:max-w-lg">
            <ReceiptPreview
              src={`/api/receipts/${id}`}
              uploadedAt={bill.receiptUploadedAt}
              label="Original receipt"
            />
          </section>
        ) : null}
      </main>
    );
  } catch (error) {
    if (error instanceof AdminUnauthorizedError) {
      notFound();
    }

    notFound();
  }
}
