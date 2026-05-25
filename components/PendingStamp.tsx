import { cn } from "@/lib/utils";

type PendingStampProps = {
  className?: string;
};

export function PendingStamp({ className }: PendingStampProps) {
  return (
    <div
      aria-label="Pending"
      className={cn(
        "pointer-events-none absolute right-4 top-4 z-10 rotate-[-6deg]",
        className,
      )}
    >
      <span className="inline-flex min-h-9 items-center rounded-md border-2 border-teh/70 bg-paper/90 px-3 font-mono text-sm font-extrabold uppercase tracking-normal text-teh shadow-[0_8px_18px_rgb(216_138_63_/_0.16)] motion-safe:animate-[stamp-bounce_360ms_cubic-bezier(0.2,0.8,0.2,1)_both]">
        PENDING
      </span>
    </div>
  );
}
