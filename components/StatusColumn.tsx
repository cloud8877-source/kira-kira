import type { Participant } from "@/db/schema";
import { cn } from "@/lib/utils";

type StatusTone = "unpaid" | "pending" | "paid";

type StatusColumnProps = {
  participants: Participant[];
  renderParticipant: (participant: Participant) => React.ReactNode;
  title: string;
  tone: StatusTone;
};

const TONE_CLASSES: Record<StatusTone, string> = {
  unpaid: "border-ink/15 bg-ink/5 text-ink/65",
  pending: "border-teh/30 bg-teh/10 text-teh",
  paid: "border-lime/30 bg-lime/10 text-lime",
};

export function StatusColumn({
  participants,
  renderParticipant,
  title,
  tone,
}: StatusColumnProps) {
  return (
    <section
      className="min-w-0 rounded-lg border border-ink/10 bg-paper-soft/90 shadow-[0_12px_30px_rgb(59_42_30_/_0.08)]"
      aria-labelledby={`${tone}-column-title`}
    >
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-dashed border-ink/15 px-3 py-3">
        <h2 className="min-w-0 break-words font-display text-xl font-semibold leading-tight text-ink" id={`${tone}-column-title`}>
          {title}
        </h2>
        <span
          className={cn(
            "inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-full border px-2 font-mono text-sm font-semibold",
            TONE_CLASSES[tone],
          )}
        >
          {participants.length}
        </span>
      </header>

      <div className="space-y-3 p-3">
        {participants.length > 0 ? (
          participants.map((participant) => renderParticipant(participant))
        ) : (
          <p className="rounded-lg border border-dashed border-ink/15 bg-paper/60 px-3 py-4 text-sm text-ink/55">
            No one yet.
          </p>
        )}
      </div>
    </section>
  );
}
