import { notFound } from "next/navigation";
import { CreatedClient } from "@/components/CopyLinkButton";
import { getDb } from "@/db";
import { getBillPublic } from "@/lib/bills/read";

type CreatedPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CreatedPage({ params }: CreatedPageProps) {
  const { id } = await params;
  const bill = await getBillPublic(getDb(), id);

  if (!bill) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:py-10">
      <section className="mx-auto flex w-full max-w-md flex-col gap-6 sm:max-w-lg">
        <header className="space-y-3 pt-3">
          <p className="font-mono text-xs font-semibold uppercase text-teh">Kira-Kira</p>
          <h1 className="font-display text-4xl font-semibold leading-tight text-ink">
            Bill ready! Share it with your group.
          </h1>
          <p className="text-base leading-7 text-ink/70">
            Bookmark the admin link to track payments. Share the public link in your WhatsApp group.
          </p>
        </header>

        <CreatedClient billId={id} title={bill.title} totalCents={bill.totalCents} />
      </section>
    </main>
  );
}
