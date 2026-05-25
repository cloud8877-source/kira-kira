"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { extractReceipt } from "@/app/actions/receipt";
import type { ParsedReceipt } from "@/lib/receipt/prompts";

type Props = {
  onExtract: (parsed: ParsedReceipt) => void;
  disabled?: boolean;
};

export function SnapReceiptButton({ onExtract, disabled }: Props) {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    inputRef.current?.click();
  }

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    startTransition(async () => {
      try {
        const result = await extractReceipt(formData);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        const hasFields = result.restaurantName || result.totalCents != null;
        if (!hasFields || result.confidence === "low") {
          toast.error("Couldn't read the receipt — please enter manually.");
          return;
        }
        onExtract(result);
        toast.success("Receipt read — review and tap Create bill.");
      } catch {
        toast.error("Couldn't read the receipt — please enter manually.");
      }
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
