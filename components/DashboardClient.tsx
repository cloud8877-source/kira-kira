"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { confirmPayment, rejectPayment } from "@/app/actions/payments";
import { ConfettiOnSettled } from "@/components/ConfettiOnSettled";
import { ParticipantRow } from "@/components/ParticipantRow";
import { ProgressRing } from "@/components/ProgressRing";
import { StatusColumn } from "@/components/StatusColumn";
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
      </header>

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
