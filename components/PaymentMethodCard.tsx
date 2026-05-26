"use client";

import { Landmark, QrCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  qrSrc?: string | null; // /api/payments/<billId>/qr if available
  instructions?: string | null;
};

export function PaymentMethodCard({ qrSrc, instructions }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [imgError, setImgError] = useState(false);
  const hasQr = Boolean(qrSrc) && !imgError;
  const hasInstructions = Boolean(instructions && instructions.trim().length > 0);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const handleClick = (e: MouseEvent) => {
      if (e.target === dlg) dlg.close();
    };
    dlg.addEventListener("click", handleClick);
    return () => dlg.removeEventListener("click", handleClick);
  }, []);

  if (!hasQr && !hasInstructions) return null;

  return (
    <section className="rounded-lg border border-ink/15 bg-paper-soft p-4 space-y-3">
      <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase text-teh">
        <Landmark className="size-3.5" aria-hidden="true" />
        How to pay the organizer
      </div>
      {hasQr ? (
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className="group flex-none rounded-md border border-ink/15 bg-paper p-1 transition hover:border-ink/30"
            aria-label="Tap to enlarge QR"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc!}
              alt="Payment QR code"
              className="size-24 object-contain transition group-hover:opacity-90"
              onError={() => setImgError(true)}
            />
          </button>
          <div className="min-w-0 flex-1 space-y-1 pt-1">
            <p className="flex items-center gap-1.5 font-display text-sm text-ink">
              <QrCode className="size-3.5" aria-hidden="true" /> Scan the QR
            </p>
            <p className="text-xs text-ink/55">
              Tap to enlarge · use your bank app or e-wallet
            </p>
          </div>
        </div>
      ) : null}
      {hasInstructions ? (
        <div className="rounded-md border border-dashed border-ink/15 bg-paper px-3 py-2 font-mono text-sm leading-6 text-ink whitespace-pre-line">
          {instructions}
        </div>
      ) : null}

      {hasQr ? (
        <dialog
          ref={dialogRef}
          className="m-auto max-h-[90vh] max-w-[92vw] rounded-xl border border-ink/15 bg-paper p-3 backdrop:bg-ink/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc!}
            alt="Payment QR code"
            className="max-h-[80vh] w-auto rounded-md object-contain"
          />
        </dialog>
      ) : null}
    </section>
  );
}
