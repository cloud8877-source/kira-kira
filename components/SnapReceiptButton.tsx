"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { extractReceipt, uploadReceipt } from "@/app/actions/receipt";
import type { ParsedReceipt } from "@/lib/receipt/prompts";

export type SnapResult = {
  ocr: ParsedReceipt | null;
  receiptKey: string | null;
  receiptMime: string | null;
  receiptUploadedAt: number | null;
  localPreviewUrl: string | null;
};

type Props = {
  onSnap: (result: SnapResult) => void;
  disabled?: boolean;
};

export function SnapReceiptButton({ onSnap, disabled }: Props) {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    inputRef.current?.click();
  }

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    // Local preview is instant — created from the picked File object
    // so the user sees the thumbnail before the server roundtrips.
    const localPreviewUrl = URL.createObjectURL(file);

    const ocrFormData = new FormData();
    ocrFormData.append("image", file);
    const uploadFormData = new FormData();
    uploadFormData.append("image", file);

    startTransition(async () => {
      // Run OCR and R2 upload in parallel — slower of the two gates the UX.
      // Each may fail independently; partial success still useful.
      const [ocrResult, uploadResult] = await Promise.allSettled([
        extractReceipt(ocrFormData),
        uploadReceipt(uploadFormData),
      ]);

      const ocrOk =
        ocrResult.status === "fulfilled" && !("error" in ocrResult.value)
          ? ocrResult.value
          : null;
      const uploadOk =
        uploadResult.status === "fulfilled" && !("error" in uploadResult.value)
          ? uploadResult.value
          : null;

      // OCR failure messaging
      if (ocrResult.status === "fulfilled" && "error" in ocrResult.value) {
        toast.error(ocrResult.value.error);
      }
      // Upload failure messaging
      if (uploadResult.status === "fulfilled" && "error" in uploadResult.value) {
        toast.error(uploadResult.value.error);
      }

      const hasReadableFields =
        ocrOk && (ocrOk.restaurantName || ocrOk.totalCents != null) && ocrOk.confidence !== "low";

      if (uploadOk && hasReadableFields) {
        toast.success("Receipt read and attached.");
      } else if (uploadOk) {
        toast.success("Receipt attached — fill in the fields manually.");
      } else if (hasReadableFields) {
        toast.success("Receipt read.");
      } else if (!ocrResult || !uploadResult) {
        toast.error("Couldn't process the receipt — please enter manually.");
      }

      onSnap({
        ocr: ocrOk,
        receiptKey: uploadOk?.receiptKey ?? null,
        receiptMime: uploadOk?.receiptMime ?? null,
        receiptUploadedAt: uploadOk?.receiptUploadedAt ?? null,
        localPreviewUrl,
      });
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handlePick}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled || isPending}
        onClick={openPicker}
        className="w-full min-h-12 gap-2 border-ink/20 bg-paper-soft text-ink hover:bg-accent"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Camera className="size-4" aria-hidden="true" />
        )}
        {isPending ? "Reading receipt…" : "Snap receipt"}
      </Button>
    </>
  );
}
