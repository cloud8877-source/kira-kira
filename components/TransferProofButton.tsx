"use client";

import { ImageIcon, Loader2 } from "lucide-react";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadTransferProof } from "@/app/actions/transfer";

export type TransferProofSnap = {
  transferProofKey: string;
  transferProofMime: string;
  transferProofUploadedAt: number;
  localPreviewUrl: string;
};

type Props = {
  billId: string;
  participantId: string;
  onUploaded: (result: TransferProofSnap) => void;
  disabled?: boolean;
};

export function TransferProofButton({ billId, participantId, onUploaded, disabled }: Props) {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const localPreviewUrl = URL.createObjectURL(file);
    const fd = new FormData();
    fd.append("image", file);
    fd.append("billId", billId);
    fd.append("participantId", participantId);
    startTransition(async () => {
      try {
        const result = await uploadTransferProof(fd);
        if ("error" in result) {
          toast.error(result.error);
          URL.revokeObjectURL(localPreviewUrl);
          return;
        }
        onUploaded({ ...result, localPreviewUrl });
        toast.success("Transfer screenshot attached.");
      } catch {
        toast.error("Couldn't upload the screenshot — try again.");
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
          <ImageIcon className="size-4" aria-hidden="true" />
        )}
        {isPending ? "Uploading screenshot…" : "Attach transfer screenshot"}
      </Button>
    </>
  );
}
