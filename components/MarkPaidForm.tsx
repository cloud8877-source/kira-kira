"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPaid } from "@/app/actions/payments";
import { deleteTransferProof } from "@/app/actions/transfer";
import { PaymentMethodCard } from "@/components/PaymentMethodCard";
import { PendingStamp } from "@/components/PendingStamp";
import { ReceiptPreview } from "@/components/ReceiptPreview";
import { TransferProofButton, type TransferProofSnap } from "@/components/TransferProofButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Participant } from "@/db/schema";

type MarkPaidFormProps = {
  billId: string;
  participantId: string;
  initialStatus: Participant["status"];
  paymentQrSrc?: string | null;
  paymentInstructions?: string | null;
};

function billPath(billId: string) {
  return `/b/${encodeURIComponent(billId)}`;
}

export function MarkPaidForm({
  billId,
  participantId,
  initialStatus,
  paymentQrSrc,
  paymentInstructions,
}: MarkPaidFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeletingProof, setIsDeletingProof] = useState(false);
  const [note, setNote] = useState("");
  const [optimisticStatus, setOptimisticStatus] = useState<Participant["status"]>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [proof, setProof] = useState<TransferProofSnap | null>(null);
  const isWaiting = optimisticStatus === "pending";
  const isPaid = optimisticStatus === "paid";
  const isLocked = optimisticStatus !== "unpaid";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const previousStatus = optimisticStatus;
    setError(null);
    setOptimisticStatus("pending");

    startTransition(async () => {
      try {
        const participant = await markPaid({
          billId,
          participantId,
          note,
          transferProofKey: proof?.transferProofKey,
          transferProofMime: proof?.transferProofMime,
          transferProofUploadedAt: proof?.transferProofUploadedAt,
        });

        if (!participant) {
          throw new Error("Could not find this participant.");
        }

        setOptimisticStatus(participant.status);
        router.refresh();
      } catch (submitError) {
        setOptimisticStatus(previousStatus);
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Could not mark this paid. Try again.",
        );
      }
    });
  }

  async function clearProof() {
    const currentKey = proof?.transferProofKey;
    const localUrl = proof?.localPreviewUrl;
    setProof(null);
    if (localUrl) {
      try { URL.revokeObjectURL(localUrl); } catch { /* ignore */ }
    }
    if (!currentKey) return;
    setIsDeletingProof(true);
    try {
      const fd = new FormData();
      fd.append("key", currentKey);
      await deleteTransferProof(fd);
    } catch {
      // R2 lifecycle still expires after 7d as backstop
    } finally {
      setIsDeletingProof(false);
    }
  }

  function clearSavedParticipant() {
    try {
      window.localStorage.removeItem(`kira-kira:${billId}`);
    } catch {
      // localStorage can be unavailable; the route change is still enough.
    }

    router.replace(billPath(billId));
  }

  return (
    <Card className="relative rounded-lg border border-ink/10 bg-paper-soft/95 shadow-[0_14px_34px_rgb(59_42_30_/_0.10)]">
      {isWaiting ? <PendingStamp /> : null}

      <CardContent className="space-y-4 pt-6">
        <PaymentMethodCard qrSrc={paymentQrSrc} instructions={paymentInstructions} />

        <form className="space-y-4" noValidate onSubmit={handleSubmit}>
          {!isLocked ? (
            <div className="space-y-2">
              <Label>Transfer screenshot (optional but encouraged)</Label>
              {proof ? (
                <ReceiptPreview
                  src={proof.localPreviewUrl}
                  uploadedAt={proof.transferProofUploadedAt}
                  label="Transfer screenshot attached"
                  onDelete={clearProof}
                  deleting={isDeletingProof}
                />
              ) : (
                <TransferProofButton
                  billId={billId}
                  participantId={participantId}
                  onUploaded={setProof}
                  disabled={isPending}
                />
              )}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="payment-note">Payment reference</Label>
            <Textarea
              id="payment-note"
              aria-describedby={error ? "payment-note-error" : undefined}
              className="min-h-28 resize-none bg-paper text-ink placeholder:text-ink/45"
              disabled={isPending || isLocked}
              maxLength={200}
              placeholder="Payment reference — e.g. Maybank TXN 12345"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          {error ? (
            <p
              className="rounded-lg border border-sambal/30 bg-sambal/10 px-3 py-2 text-sm text-sambal"
              id="payment-note-error"
            >
              {error}
            </p>
          ) : null}

          {isWaiting ? (
            <p className="rounded-lg border border-teh/25 bg-teh/10 px-3 py-2 text-sm font-medium text-ink">
              Waiting for organizer to confirm...
            </p>
          ) : null}

          {isPaid ? (
            <p className="rounded-lg border border-lime/25 bg-lime/10 px-3 py-2 text-sm font-medium text-ink">
              This payment is marked paid.
            </p>
          ) : null}

          <Button
            className="min-h-12 w-full bg-teh px-4 text-base font-semibold text-ink shadow-[0_8px_0_rgb(59_42_30_/_0.14)] hover:bg-teh/90"
            disabled={isPending || isLocked}
            type="submit"
          >
            Mark as paid
          </Button>
        </form>

        <Button
          className="min-h-11 px-0 text-sm font-semibold text-teh"
          type="button"
          variant="link"
          onClick={clearSavedParticipant}
        >
          Not you?
        </Button>
      </CardContent>
    </Card>
  );
}
