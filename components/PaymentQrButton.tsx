"use client";

import { Loader2, QrCode } from "lucide-react";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadPaymentQr } from "@/app/actions/payment-method";

export type PaymentQrSnap = {
  paymentQrKey: string;
  paymentQrMime: string;
  paymentQrUploadedAt: number;
  localPreviewUrl: string;
};

type Props = {
  onUploaded: (result: PaymentQrSnap) => void;
  disabled?: boolean;
};

export function PaymentQrButton({ onUploaded, disabled }: Props) {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const localPreviewUrl = URL.createObjectURL(file);
    const fd = new FormData();
    fd.append("image", file);
    startTransition(async () => {
      try {
        const result = await uploadPaymentQr(fd);
        if ("error" in result) {
          toast.error(result.error);
          URL.revokeObjectURL(localPreviewUrl);
          return;
        }
        onUploaded({ ...result, localPreviewUrl });
        toast.success("Payment QR attached.");
      } catch {
        toast.error("Couldn't upload the QR — try again.");
        URL.revokeObjectURL(localPreviewUrl);
      }
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handlePick}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled || isPending}
        onClick={() => inputRef.current?.click()}
        className="w-full min-h-12 gap-2 border-ink/20 bg-paper-soft text-ink hover:bg-accent"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <QrCode className="size-4" aria-hidden="true" />
        )}
        {isPending ? "Uploading QR…" : "Upload payment QR"}
      </Button>
    </>
  );
}
