"use client";

import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { markBillSettled } from "@/app/actions/bills";
import { confirmPayment, rejectPayment } from "@/app/actions/payments";
import { ConfettiOnSettled } from "@/components/ConfettiOnSettled";
import { ParticipantRow } from "@/components/ParticipantRow";
import { ProgressRing } from "@/components/ProgressRing";
import { SettlementModal } from "@/components/SettlementModal";
import { StatusColumn } from "@/components/StatusColumn";
import { Button } from "@/components/ui/button";
import type { Participant } from "@/db/schema";
import type { BillView } from "@/lib/bills/read";
import { formatRm } from "@/lib/money";

type DashboardClientProps = {
  adminSecret: string;
  billId: string;
  initialBill: BillView;
};

const HIGHLIGHT_MS = 1500;

async function fetchBill(url: string): Promise<BillView> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not refresh dashboard.");
  }

  return response.json() as Promise<BillView>;
}

function progressFor(participants: Participant[]) {
  if (participants.length === 0) {
    return 0;
  }

  const paidCount = participants.filter((participant) => participant.status === "paid").length;
  return Math.round((paidCount * 100) / participants.length);
}

function withParticipantStatus(
  bill: BillView,
  participantId: string,
  status: Participant["status"],
): BillView {
  const participants = bill.participants.map((participant) => {
    if (participant.id !== participantId) {
      return participant;
    }

    if (status === "unpaid") {
      return {
        ...participant,
        confirmedAt: null,
        note: null,
        paidAt: null,
        status,
      };
    }

    if (status === "paid") {
      return {
        ...participant,
        confirmedAt: new Date(),
        status,
      };
    }

    return { ...participant, status };
  });

  return {
    ...bill,
    participants,
    progress: progressFor(participants),
  };
}

function groupParticipants(participants: Participant[]) {
  return {
    paid: participants.filter((participant) => participant.status === "paid"),
    pending: participants.filter((participant) => participant.status === "pending"),
    unpaid: participants.filter((participant) => participant.status === "unpaid"),
  };
}

function formatDueDate(dueDate: BillView["dueDate"] | string) {
  if (!dueDate) {
    return null;
  }

  const date = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function DashboardClient({ adminSecret, billId, initialBill }: DashboardClientProps) {
  const [isMutating, startTransition] = useTransition();
  const [publicUrl, setPublicUrl] = useState(`/b/${encodeURIComponent(billId)}`);
  const [justPaidIds, setJustPaidIds] = useState<Set<string>>(() => new Set());
  const previousBillRef = useRef<BillView | null>(null);
  const pollPath = `/b/${encodeURIComponent(billId)}/admin/poll?k=${encodeURIComponent(
    adminSecret,
  )}`;
  const { data, mutate } = useSWR<BillView>(pollPath, fetchBill, {
    fallbackData: initialBill,
    refreshInterval: 4000,
  });
  const bill = data ?? initialBill;
  const grouped = useMemo(() => groupParticipants(bill.participants), [bill.participants]);
  const paidCount = grouped.paid.length;
  const totalCount = bill.participants.length;
  const dueDate = formatDueDate(bill.dueDate);

  useEffect(() => {
    setPublicUrl(`${window.location.origin}/b/${encodeURIComponent(billId)}`);
  }, [billId]);

  useEffect(() => {
    const previousBill = previousBillRef.current;
    previousBillRef.current = bill;

    if (!previousBill) {
      return;
    }

    const previousStatuses = new Map(
      previousBill.participants.map((participant) => [participant.id, participant.status]),
    );
    const newlyPaidIds = bill.participants
      .filter(
        (participant) =>
          previousStatuses.get(participant.id) === "pending" && participant.status === "paid",
      )
      .map((participant) => participant.id);

    if (newlyPaidIds.length === 0) {
      return;
    }

    setJustPaidIds((current) => new Set([...current, ...newlyPaidIds]));

    for (const participantId of newlyPaidIds) {
      window.setTimeout(() => {
        setJustPaidIds((current) => {
          const next = new Set(current);
          next.delete(participantId);
          return next;
        });
      }, HIGHLIGHT_MS);
    }
  }, [bill]);

  function handleConfirm(participantId: string) {
    const previousBill = bill;

    startTransition(async () => {
      await mutate(
        (current) => (current ? withParticipantStatus(current, participantId, "paid") : current),
        { revalidate: false },
      );

      try {
        const participant = await confirmPayment({ adminSecret, billId, participantId });
        if (!participant) {
          throw new Error("Could not find this participant.");
        }
        toast.success("Confirmed!");
      } catch {
        await mutate(previousBill, { revalidate: false });
        toast.error("Could not confirm. Try again.");
      } finally {
        void mutate();
      }
    });
  }

  function handleReject(participantId: string) {
    const previousBill = bill;

    startTransition(async () => {
      await mutate(
        (current) => (current ? withParticipantStatus(current, participantId, "unpaid") : current),
        { revalidate: false },
      );

      try {
        const participant = await rejectPayment({ adminSecret, billId, participantId });
        if (!participant) {
          throw new Error("Could not find this participant.");
        }
        toast.success("Reverted.");
      } catch {
        await mutate(previousBill, { revalidate: false });
        toast.error("Could not reject. Try again.");
      } finally {
        void mutate();
      }
    });
  }

  function renderParticipant(participant: Participant) {
    return (
      <ParticipantRow
        billId={billId}
        adminSecret={adminSecret}
        billTitle={bill.title}
        dataJustPaid={justPaidIds.has(participant.id)}
        isMutating={isMutating}
        key={participant.id}
        participant={participant}
        publicUrl={publicUrl}
        onConfirm={handleConfirm}
        onReject={handleReject}
      />
    );
  }

  const isSettled = Boolean(bill.settledAt);
  const allPaid = bill.progress === 100 && bill.participants.length > 0;
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [isSettling, startSettling] = useTransition();

  // Auto-open the modal once the bill becomes settled (organizer-driven flow)
  // so they see the PDF / delete / auto-delete options immediately.
  const lastSettledRef = useRef<string | null>(bill.settledAt ? String(bill.settledAt) : null);
  useEffect(() => {
    const current = bill.settledAt ? String(bill.settledAt) : null;
    if (current && current !== lastSettledRef.current) {
      setSettlementOpen(true);
    }
    lastSettledRef.current = current;
  }, [bill.settledAt]);

  function handleMarkSettled() {
    startSettling(async () => {
      const result = await markBillSettled({ billId, adminSecret });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Bill marked settled!");
      void mutate();
      setSettlementOpen(true);
    });
  }

  const expiresAt = bill.expiresAt ? new Date(bill.expiresAt) : null;
  const expiresInDays = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000))
    : null;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
      <ConfettiOnSettled billId={billId} percent={bill.progress} />

      <header className="rounded-lg border border-ink/10 bg-paper-soft/95 p-4 shadow-[0_18px_50px_rgb(59_42_30_/_0.12)] sm:p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <p className="font-mono text-xs font-semibold uppercase tracking-normal text-teh">
                Organizer dashboard
              </p>
              <h1 className="break-words font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                {bill.title}
              </h1>
            </div>

            <div className="flex flex-wrap gap-2 font-mono text-sm font-semibold text-ink/70">
              <span className="rounded-md border border-dashed border-ink/15 bg-paper/70 px-2.5 py-1">
                {formatRm(bill.totalCents)} total
              </span>
              {dueDate ? (
                <span className="rounded-md border border-dashed border-ink/15 bg-paper/70 px-2.5 py-1">
                  Due {dueDate}
                </span>
              ) : null}
            </div>
          </div>

          <ProgressRing paidCount={paidCount} percent={bill.progress} totalCount={totalCount} />
        </div>

        {expiresInDays != null ? (
          <p className="mt-4 flex items-center gap-1.5 rounded-md border border-dashed border-ink/15 bg-paper/70 px-3 py-2 text-xs font-mono text-ink/70">
            <Clock className="size-3.5" aria-hidden="true" />
            Auto-deletes in {expiresInDays} day{expiresInDays === 1 ? "" : "s"}
          </p>
        ) : null}
      </header>

      {allPaid && !isSettled ? (
        <div className="rounded-lg border border-lime/30 bg-lime/10 p-4 text-center space-y-3">
          <p className="font-display text-lg text-ink">Everyone has paid 🎉</p>
          <p className="text-sm text-ink/70">
            Acknowledge settlement to download the report and clean up.
          </p>
          <Button
            type="button"
            className="min-h-12 gap-2 bg-lime px-6 text-base font-semibold text-paper hover:bg-lime/90"
            onClick={handleMarkSettled}
            disabled={isSettling}
          >
            {isSettling ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-5" aria-hidden="true" />}
            Mark bill as settled
          </Button>
        </div>
      ) : null}

      {isSettled ? (
        <div className="rounded-lg border border-lime/30 bg-lime/5 p-4 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="flex items-center gap-1.5 font-display text-base text-ink">
              <CheckCircle2 className="size-4 text-lime" aria-hidden="true" /> Bill settled
            </p>
            <p className="text-xs text-ink/55">
              Download the report or remove everything.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-10 border-ink/20 text-ink hover:bg-paper-soft"
            onClick={() => setSettlementOpen(true)}
          >
            Open
          </Button>
        </div>
      ) : null}

      <SettlementModal
        open={settlementOpen}
        onClose={() => setSettlementOpen(false)}
        billId={billId}
        adminSecret={adminSecret}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatusColumn
          participants={grouped.unpaid}
          renderParticipant={renderParticipant}
          title="Unpaid"
          tone="unpaid"
        />
        <StatusColumn
          participants={grouped.pending}
          renderParticipant={renderParticipant}
          title="Pending verification"
          tone="pending"
        />
        <StatusColumn
          participants={grouped.paid}
          renderParticipant={renderParticipant}
          title="Paid"
          tone="paid"
        />
      </div>
    </section>
  );
}
