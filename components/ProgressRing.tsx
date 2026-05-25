import { cn } from "@/lib/utils";

type ProgressRingProps = {
  paidCount: number;
  percent: number;
  totalCount: number;
  className?: string;
};

const RING_SIZE = 128;
const STROKE_WIDTH = 10;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function clampPercent(percent: number) {
  if (!Number.isFinite(percent)) {
    return 0;
  }

  return Math.min(100, Math.max(0, percent));
}

export function ProgressRing({
  paidCount,
  percent,
  totalCount,
  className,
}: ProgressRingProps) {
  const clampedPercent = clampPercent(percent);
  const strokeOffset = CIRCUMFERENCE - (clampedPercent / 100) * CIRCUMFERENCE;
  const isSettled = clampedPercent >= 100;

  return (
    <div
      className={cn(
        "relative flex size-32 shrink-0 items-center justify-center rounded-full bg-paper/80",
        className,
      )}
      aria-label={`${paidCount} of ${totalCount} paid, ${clampedPercent}%`}
      role="img"
    >
      <svg className="size-32 -rotate-90" viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
        <circle
          className="stroke-ink/10"
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
        />
        <circle
          className={cn(
            "transition-[stroke-dashoffset,stroke] duration-500 ease-out",
            isSettled ? "stroke-lime" : "stroke-teh",
          )}
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          r={RADIUS}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeOffset}
          strokeWidth={STROKE_WIDTH}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-3xl font-semibold text-ink">{clampedPercent}%</span>
        <span className="font-mono text-[0.68rem] font-semibold uppercase tracking-normal text-ink/55">
          {paidCount}/{totalCount} paid
        </span>
      </div>
    </div>
  );
}
