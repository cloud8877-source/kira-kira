import { Coffee, ReceiptText } from "lucide-react";
import { CreateBillForm } from "@/components/CreateBillForm";

export default function Page() {
  return (
    <main className="min-h-screen px-4 py-6 sm:py-10">
      <section className="mx-auto flex w-full max-w-md flex-col gap-6 sm:max-w-lg">
        <header className="space-y-5 pt-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex size-12 items-center justify-center rounded-lg border border-ink/15 bg-paper-soft text-teh shadow-sm">
              <Coffee className="size-6" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-2 rounded-md border border-ink/15 bg-paper-soft px-3 py-2 font-mono text-xs uppercase text-ink/70">
              <ReceiptText className="size-4 text-teh" aria-hidden="true" />
              Kopi-Susu
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-6xl font-semibold leading-[0.95] text-ink sm:text-7xl">
              Kira-Kira
            </h1>
            <p className="max-w-[18rem] text-xl font-medium leading-7 text-ink/75">
              Bayar sama-sama, tanpa segan.
            </p>
          </div>
        </header>

        <CreateBillForm />
      </section>
    </main>
  );
}
