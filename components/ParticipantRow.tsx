"use client";

import { Check, X } from "lucide-react";
import { NudgeButton } from "@/components/NudgeButton";
import { ReceiptPreview } from "@/components/ReceiptPreview";
import { Button } from "@/components/ui/button";
import type { Participant } from "@/db/schema";
import { formatRm } from "@/lib/money";
import { cn } from "@/lib/utils";

type ParticipantRowProps = {
  billId: string;
  adminSecret: string;
  billTitle: string;
  dataJustPaid?: boolean;
  isMutating?: boolean;
  onConfirm?: (participantId: string) => void;
  onReject?: (participantId: string) => void;
  participant: Participant;
  publicUrl: string;
};

const STATUS_LABELS: Record<Participant["status"], string> = {
  unpaid: "Unpaid",
  pending: "Pending verification",
  paid: "Paid",
};

const STATUS_CLASSES: Record<Participant["status"], string> = {
  unpaid: "border-ink/15 bg-ink/5 text-ink/60",
  pending: "border-teh/35 bg-teh/15 text-teh",
  paid: "border-lime/35 bg-lime/15 text-lime",
};

export function ParticipantRow({
  billId,
  adminSecret,
  billTitle,
  dataJustPaid = false,
  isMutating = false,
  onConfirm,
  onReject,
  participant,
  publicUrl,
}: ParticipantRowProps) {
  const isPendingVerification = participant.status === "pending";
  const isUnpaid = participant.status === "unpaid";

  return (
    <div
      className="rounded-lg border border-ink/10 bg-paper/80 p-3 transition-colors"
      data-just-paid={dataJustPaid ? "true" : undefined}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="break-words text-base font-semibold leading-6 text-ink">
              {participant.name}
            </p>
            <p className="font-mono text-sm font-semibold text-ink/70">
              {formatRm(participant.amountCents)}
            </p>
          </div>

          <span
            className={cn(
              "inline-flex min-h-7 shrink-0 items-center rounded-full border px-2.5 font-mono text-[0.68rem] font-semibold uppercase tracking-normal",
              STATUS_CLASSES[participant.status],
            )}
          >
            {STATUS_LABELS[participant.status]}
          </span>
        </div>

        {isPendingVerification && participant.note ? (
          <p className="break-words rounded-md border border-dashed border-teh/25 bg-teh/10 px-3 py-2 text-sm leading-5 text-ink/70">
            {participant.note}
          </p>
        ) : null}

        {isPendingVerification && participant.transferProofKey ? (
          <ReceiptPreview
            src={`/api/transfers/${billId}/${participant.id}?k=${encodeURIComponent(adminSecret)}`}
            uploadedAt={participant.transferProofUploadedAt}
            label="Transfer screenshot"
          />
        ) : null}

        {isPendingVerification ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              className="min-h-11 gap-2 bg-lime font-semibold text-paper hover:bg-lime/90"
              disabled={isMutating}
              type="button"
              onClick={() => onConfirm?.(participant.id)}
            >
              <Check className="size-4" aria-hidden="true" />
              Confirm
            </Button>
            <Button
              className="min-h-11 gap-2 bg-sambal font-semibold text-paper hover:bg-sambal/90"
              disabled={isMutating}
              type="button"
              onClick={() => onReject?.(participant.id)}
            >
              <X className="size-4" aria-hidden="true" />
              Reject
            </Button>
          </div>
        ) : null}

        {isUnpaid ? (
          <NudgeButton
            amountCents={participant.amountCents}
            billTitle={billTitle}
            name={participant.name}
            phone={participant.phone}
            publicUrl={publicUrl}
          />
        ) : null}
      </div>
    </div>
  );
}
