"use client";

import { Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  uploadedAt: number | Date | null | undefined; // unix seconds OR Date OR null
  retentionDays?: number; // default 7
  label?: string; // override the caption (e.g. "From your phone")
  onDelete?: () => void; // when present, shows a delete button
  deleting?: boolean; // disables the delete button + shows pending state
};

function daysRemaining(uploadedAt: Props["uploadedAt"], retentionDays: number): number {
  if (uploadedAt == null) return retentionDays;
  const uploadedSec =
    uploadedAt instanceof Date ? Math.floor(uploadedAt.getTime() / 1000) : uploadedAt;
  const nowSec = Math.floor(Date.now() / 1000);
  const remainingSec = uploadedSec + retentionDays * 86400 - nowSec;
  return Math.max(0, Math.ceil(remainingSec / 86400));
}

export function ReceiptPreview({
  src,
  uploadedAt,
  retentionDays = 7,
  label,
  onDelete,
  deleting = false,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [imgError, setImgError] = useState(false);
  const remaining = daysRemaining(uploadedAt, retentionDays);

  function open() {
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
  }

  // Close on backdrop click (native dialog quirk)
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const handleClick = (e: MouseEvent) => {
      if (e.target === dlg) close();
    };
    dlg.addEventListener("click", handleClick);
    return () => dlg.removeEventListener("click", handleClick);
  }, []);

  if (imgError) {
    return (
      <div className="rounded-lg border border-dashed border-ink/15 bg-paper-soft/60 px-4 py-6 text-center text-sm text-ink/60">
        Receipt expired (auto-deleted after {retentionDays} days).
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full overflow-hidden rounded-lg border border-ink/15 bg-paper-soft p-2">
        <button
          type="button"
          onClick={open}
          className="group block w-full text-left"
        >
          <div className="flex items-start gap-3">
            {/* Using a plain <img> so the route handler streams from R2 directly */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Receipt"
              className="h-28 w-20 flex-none rounded-md object-cover shadow-sm transition group-hover:opacity-90"
              onError={() => setImgError(true)}
            />
            <div className="min-w-0 flex-1 space-y-1 pt-1 pr-10">
              <p className="font-display text-sm text-ink">{label ?? "Receipt attached"}</p>
              <p className="text-xs text-ink/55">
                Tap to enlarge · Auto-deletes in {remaining} day{remaining === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!deleting) onDelete();
            }}
            disabled={deleting}
            aria-label="Remove receipt"
            className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-md border border-ink/15 bg-paper text-ink/70 transition hover:border-sambal/40 hover:bg-sambal/10 hover:text-sambal disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <dialog
        ref={dialogRef}
        className="m-auto max-h-[90vh] max-w-[92vw] rounded-xl border border-ink/15 bg-paper p-2 backdrop:bg-ink/40"
      >
        <div className="flex justify-end pb-1">
          <button
            type="button"
            onClick={close}
            aria-label="Close receipt"
            className="rounded-md p-1.5 text-ink/70 hover:bg-paper-soft hover:text-ink"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Receipt"
          className="max-h-[78vh] w-auto rounded-md object-contain"
          onError={() => setImgError(true)}
        />
      </dialog>
    </>
  );
}
