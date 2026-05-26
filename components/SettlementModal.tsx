"use client";

import { Clock, Loader2, PartyPopper, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteBill, scheduleBillExpiry } from "@/app/actions/bills";
import { PdfReportButton } from "@/components/PdfReportButton";

type Props = {
  open: boolean;
  onClose: () => void;
  billId: string;
  adminSecret: string;
};

export function SettlementModal({ open, onClose, billId, adminSecret }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  function handleAutoDelete() {
    startTransition(async () => {
      const result = await scheduleBillExpiry({ billId, adminSecret, retentionDays: 7 });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Bill will auto-delete in 7 days.");
      onClose();
    });
  }

  function handleDeleteNow() {
    startTransition(async () => {
      const result = await deleteBill({ billId, adminSecret });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Bill deleted.");
      router.replace("/");
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto max-w-md rounded-xl border border-ink/15 bg-paper p-6 backdrop:bg-ink/40"
    >
      <div className="space-y-5">
        <header className="space-y-2 text-center">
          <PartyPopper className="mx-auto size-10 text-lime" aria-hidden="true" />
          <h2 className="font-display text-2xl font-semibold text-ink">Bill settled!</h2>
          <p className="text-sm text-ink/65">
            Everyone has paid. Download the full report before deleting, or let it auto-delete in 7 days.
          </p>
        </header>

        <div className="space-y-2">
          <PdfReportButton billId={billId} adminSecret={adminSecret} className="w-full" />

          {showDeleteConfirm ? (
            <div className="space-y-2 rounded-lg border border-sambal/30 bg-sambal/5 p-3">
              <p className="text-sm text-ink">
                Delete everything now? The bill, all receipts and transfer screenshots
                will be permanently removed. This can&apos;t be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1 gap-2 bg-sambal text-paper hover:bg-sambal/90"
                  onClick={handleDeleteNow}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  Yes, delete now
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-12 gap-2 border-sambal/40 text-sambal hover:bg-sambal/10"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isPending}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete everything now
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full min-h-12 gap-2 border-ink/20 text-ink hover:bg-paper-soft"
            onClick={handleAutoDelete}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Clock className="size-4" />}
            Auto-delete in 7 days
          </Button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="block w-full text-center text-xs text-ink/50 hover:text-ink"
        >
          Close · decide later
        </button>
      </div>
    </dialog>
  );
}
