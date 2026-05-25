"use client";

import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatRm } from "@/lib/money";
import { cn } from "@/lib/utils";

type WhatsAppShareButtonProps = {
  billTitle: string;
  totalCents: number;
  publicUrl: string;
};

export function WhatsAppShareButton({
  billTitle,
  totalCents,
  publicUrl,
}: WhatsAppShareButtonProps) {
  const message = `Eh geng, bil kopi/makan kita: ${billTitle} — ${formatRm(
    totalCents,
  )} sekali. Tap & bayar lah → ${publicUrl}`;
  const href = "https://wa.me/?text=" + encodeURIComponent(message);

  return (
    <a
      className={cn(
        buttonVariants(),
        "min-h-12 w-full gap-2 bg-lime px-4 text-base font-semibold text-paper hover:bg-lime/90",
      )}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <MessageCircle className="size-5" aria-hidden="true" />
      Hantar kat WhatsApp
    </a>
  );
}
