"use client";

import { AlertCircle, Loader2, PencilLine, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateBillPaymentMethod } from "@/app/actions/bills";
import { deletePaymentQr } from "@/app/actions/payment-method";
import { PaymentMethodCard } from "@/components/PaymentMethodCard";
import { PaymentQrButton, type PaymentQrSnap } from "@/components/PaymentQrButton";
import { ReceiptPreview } from "@/components/ReceiptPreview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  billId: string;
  adminSecret: string;
  initialQrKey: string | null;
  initialQrMime: string | null;
  initialQrUploadedAt: Date | null;
  initialInstructions: string | null;
  onSaved?: () => void;
};

export function PaymentMethodAdmin({
  billId,
  adminSecret,
  initialQrKey,
  initialQrMime,
  initialQrUploadedAt,
  initialInstructions,
  onSaved,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeletingQr, setIsDeletingQr] = useState(false);

  // Draft state held only while editing — on save we POST and refresh.
  const [qrKey, setQrKey] = useState<string | null>(initialQrKey);
  const [qrMime, setQrMime] = useState<string | null>(initialQrMime);
  const [qrUploadedAt, setQrUploadedAt] = useState<number | null>(
    initialQrUploadedAt ? Math.floor(initialQrUploadedAt.getTime() / 1000) : null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<string>(initialInstructions ?? "");

  const hasAnythingPersisted = Boolean(initialQrKey) || Boolean(initialInstructions);

  function handleQrUploaded(snap: PaymentQrSnap) {
    if (previewUrl) {
      try { URL.revokeObjectURL(previewUrl); } catch { /* ignore */ }
    }
    setQrKey(snap.paymentQrKey);
    setQrMime(snap.paymentQrMime);
    setQrUploadedAt(snap.paymentQrUploadedAt);
    setPreviewUrl(snap.localPreviewUrl);
  }

  async function handleRemoveQr() {
    const oldKey = qrKey;
    setQrKey(null);
    setQrMime(null);
    setQrUploadedAt(null);
    if (previewUrl) {
      try { URL.revokeObjectURL(previewUrl); } catch { /* ignore */ }
      setPreviewUrl(null);
    }
    if (oldKey && oldKey !== initialQrKey) {
      // Only purge from R2 if it's a draft upload we made in this session;
      // the previously-persisted key stays until Save commits the change.
      setIsDeletingQr(true);
      try {
        const fd = new FormData();
        fd.append("key", oldKey);
        await deletePaymentQr(fd);
      } catch {
        // ignore — lifecycle backstops
      } finally {
        setIsDeletingQr(false);
      }
    }
  }

  function handleCancel() {
    setQrKey(initialQrKey);
    setQrMime(initialQrMime);
    setQrUploadedAt(initialQrUploadedAt ? Math.floor(initialQrUploadedAt.getTime() / 1000) : null);
    setInstructions(initialInstructions ?? "");
    if (previewUrl) {
      try { URL.revokeObjectURL(previewUrl); } catch { /* ignore */ }
      setPreviewUrl(null);
    }
    setEditing(false);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateBillPaymentMethod({
        billId,
        adminSecret,
        paymentQrKey: qrKey ?? undefined,
        paymentQrMime: qrMime ?? undefined,
        paymentQrUploadedAt: qrUploadedAt ?? undefined,
        paymentInstructions: instructions || undefined,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment method updated.");
      setEditing(false);
      onSaved?.();
    });
  }

  // VIEW MODE — when not editing
  if (!editing) {
    return (
      <section className="rounded-lg border border-ink/15 bg-paper-soft/95 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="font-mono text-xs font-semibold uppercase text-teh">Payment method</p>
            <p className="text-xs text-ink/55">
              {hasAnythingPersisted
                ? "Members see this on the bill page."
                : "Members don't know how to pay you yet."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-9 gap-1.5 border-ink/20 text-ink hover:bg-paper"
            onClick={() => setEditing(true)}
          >
            <PencilLine className="size-3.5" aria-hidden="true" />
            {hasAnythingPersisted ? "Edit" : "Add"}
          </Button>
        </div>

        {hasAnythingPersisted ? (
          <PaymentMethodCard
            qrSrc={initialQrKey ? `/api/payments/${billId}/qr` : null}
            instructions={initialInstructions}
          />
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-dashed border-sambal/30 bg-sambal/5 p-3 text-sm text-sambal">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              Tap <strong>Add</strong> to upload your TNG / Boost / DuitNow QR or paste bank-account
              info. Members can&apos;t pay until you set one.
            </p>
          </div>
        )}
      </section>
    );
  }

  // EDIT MODE
  const showCurrentQr = qrKey
    ? previewUrl ?? (qrKey === initialQrKey ? `/api/payments/${billId}/qr` : null)
    : null;

  return (
    <section className="rounded-lg border border-ink/15 bg-paper-soft/95 p-4 space-y-4">
      <div className="space-y-0.5">
        <p className="font-mono text-xs font-semibold uppercase text-teh">Edit payment method</p>
        <p className="text-xs text-ink/55">Upload a QR or type bank info. Both optional.</p>
      </div>

      <div className="space-y-2">
        <Label>Payment QR (optional)</Label>
        {showCurrentQr ? (
          <ReceiptPreview
            src={showCurrentQr}
            uploadedAt={qrUploadedAt}
            label="Payment QR attached"
            onDelete={handleRemoveQr}
            deleting={isDeletingQr}
          />
        ) : (
          <PaymentQrButton onUploaded={handleQrUploaded} disabled={isPending} />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-payment-instructions">Bank info or notes</Label>
        <Textarea
          id="admin-payment-instructions"
          className="min-h-20 resize-none bg-paper text-ink placeholder:text-ink/45"
          maxLength={500}
          placeholder="e.g. Maybank 1234567890 · Aisyah binti Ahmad"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-ink/20 text-ink hover:bg-paper"
          onClick={handleCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="flex-1 gap-2 bg-teh text-ink hover:bg-teh/90"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          Save
        </Button>
      </div>
    </section>
  );
}
