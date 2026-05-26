import { ReceiptText } from "lucide-react";
import { CreateBillForm } from "@/components/CreateBillForm";

export default function Page() {
  return (
    <main className="min-h-screen px-4 py-6 sm:py-10">
      <section className="mx-auto flex w-full max-w-md flex-col gap-6 sm:max-w-lg">
        <header className="space-y-5 pt-3">
          <div className="flex items-center justify-between gap-4">
            <KopiCupHero />
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
              Split bills without the awkward chase.
            </p>
          </div>
        </header>

        <CreateBillForm />
      </section>
    </main>
  );
}

function KopiCupHero() {
  return (
    <div
      aria-hidden="true"
      className="relative flex size-12 items-center justify-center rounded-lg border border-ink/15 bg-paper-soft text-teh shadow-sm"
    >
      {/* Steam wisps — three offset for natural drift, staggered delay */}
      <svg
        className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2"
        width="22"
        height="14"
        viewBox="0 0 22 14"
        fill="none"
      >
        <path
          className="steam-wisp"
          d="M5 11c0-2 2-2 2-4s-2-2-2-4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          style={{ animationDelay: "0s" }}
        />
        <path
          className="steam-wisp"
          d="M11 12c0-2 2-2 2-4s-2-2-2-4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          style={{ animationDelay: "0.8s" }}
        />
        <path
          className="steam-wisp"
          d="M17 11c0-2 2-2 2-4s-2-2-2-4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          style={{ animationDelay: "1.6s" }}
        />
      </svg>
      {/* Coffee cup with saucer */}
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        fill="none"
        className="text-teh"
      >
        <path
          d="M5 9h13v6a5 5 0 0 1-5 5h-3a5 5 0 0 1-5-5V9Z"
          fill="currentColor"
          opacity="0.95"
        />
        <path
          d="M18 11h2a3 3 0 0 1 0 6h-2"
          stroke="currentColor"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        <line
          x1="3"
          y1="22"
          x2="21"
          y2="22"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
