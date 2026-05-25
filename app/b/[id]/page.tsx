import { notFound } from "next/navigation";
import { BillReceipt } from "@/components/BillReceipt";
import { ParticipantPicker } from "@/components/ParticipantPicker";
import { PrintInAnimation } from "@/components/PrintInAnimation";
import { getDb } from "@/db";
import { getBillPublic } from "@/lib/bills/read";

type PublicBillPageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

        <ParticipantPicker billId={id} participants={bill.participants} />
      </section>
    </main>
  );
}
