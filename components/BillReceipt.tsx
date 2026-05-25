import type { Participant } from "@/db/schema";
import type { BillView } from "@/lib/bills/read";
import { formatRm } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type BillReceiptProps = {
  bill: BillView;
};

const STATUS_LABELS: Record<Participant["status"], string> = {
  unpaid: "Unpaid",
  pending: "Pending",
  paid: "Paid",
};

const STATUS_CLASSES: Record<Participant["status"], string> = {
  unpaid: "border-ink/15 bg-ink/5 text-ink/60",
  pending: "border-teh/35 bg-teh/15 text-teh",
  paid: "border-lime/35 bg-lime/15 text-lime",
};

function formatDate(date: Date | null) {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function StatusBadge({ status }: { status: Participant["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 font-mono text-[0.68rem] font-semibold uppercase tracking-normal",
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function BillReceipt({ bill }: BillReceiptProps) {
  const dueDate = formatDate(bill.dueDate);

  return (
    <Card className="relative overflow-visible rounded-lg border border-ink/10 bg-paper-soft/95 py-0 shadow-[0_18px_50px_rgb(59_42_30_/_0.14)]">
      <CardHeader className="gap-4 border-b border-dashed border-ink/20 px-4 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="font-mono text-xs font-semibold uppercase text-teh">Kira-Kira</p>
            <h1 className="break-words font-display text-3xl font-semibold leading-tight text-ink">
              {bill.title}
            </h1>
          </div>
          <div className="shrink-0 rounded-md border border-dashed border-ink/20 px-2 py-1 font-mono text-xs font-semibold uppercase text-ink/55">
            Receipt
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-dashed border-ink/15 bg-paper/70 p-3 text-sm text-ink/70 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[0.68rem] font-semibold uppercase text-ink/45">
              Total
            </p>
            <p className="font-mono text-lg font-semibold text-ink">{formatRm(bill.totalCents)}</p>
          </div>
          <div>
            <p className="font-mono text-[0.68rem] font-semibold uppercase text-ink/45">
              Progress
            </p>
            <p className="font-mono text-lg font-semibold text-ink">{bill.progress}% paid</p>
          </div>
          {dueDate ? (
            <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase text-ink/45">
                Due
              </p>
              <p className="font-mono text-sm font-semibold text-ink">{dueDate}</p>
            </div>
          ) : null}
          <div>
            <p className="font-mono text-[0.68rem] font-semibold uppercase text-ink/45">
              People
            </p>
            <p className="font-mono text-sm font-semibold text-ink">
              {bill.participants.length}
            </p>
          </div>
        </div>

        {bill.description ? (
          <p className="break-words rounded-lg border border-dashed border-ink/15 bg-paper/70 px-3 py-3 text-sm leading-6 text-ink/70">
            {bill.description}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-2 px-4 py-4">
        <div className="border-b border-dashed border-ink/20 pb-2 font-mono text-[0.68rem] font-semibold uppercase text-ink/45">
          Participants
        </div>

        <div className="divide-y divide-dashed divide-ink/15">
          {bill.participants.map((participant) => (
            <div
              className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-3 py-3"
              key={participant.id}
            >
              <div className="min-w-0 space-y-1">
                <p className="break-words text-base font-semibold leading-6 text-ink">
                  {participant.name}
                </p>
                <p className="font-mono text-sm font-semibold text-ink/72">
                  {formatRm(participant.amountCents)}
                </p>
              </div>
              <StatusBadge status={participant.status} />
            </div>
          ))}
        </div>
      </CardContent>

      <div
        aria-hidden="true"
        className="absolute inset-x-4 -bottom-3 h-6 border-t border-dashed border-ink/20 bg-paper-soft [clip-path:polygon(0_0,4%_100%,8%_0,12%_100%,16%_0,20%_100%,24%_0,28%_100%,32%_0,36%_100%,40%_0,44%_100%,48%_0,52%_100%,56%_0,60%_100%,64%_0,68%_100%,72%_0,76%_100%,80%_0,84%_100%,88%_0,92%_100%,96%_0,100%_100%,100%_0)]"
      />
    </Card>
  );
}
