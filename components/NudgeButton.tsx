"use client";

import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { buildNudgeUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type NudgeButtonProps = {
  amountCents: number;
  billTitle: string;
  name: string;
  phone?: string | null;
  publicUrl: string;
};

export function NudgeButton({
  amountCents,
  billTitle,
  name,
  phone,
  publicUrl,
}: NudgeButtonProps) {
  const nudge = buildNudgeUrl({
    amountCents,
    billTitle,
    name,
    phone,
    publicUrl,
  });

  const className = cn(
    buttonVariants({ variant: "outline" }),
    "min-h-11 w-full gap-2 border-lime/25 bg-lime/10 px-3 font-semibold text-lime hover:bg-lime/15 sm:w-auto",
  );

  if (nudge.wa) {
    return (
      <a className={className} href={nudge.wa} rel="noreferrer" target="_blank">
        <MessageCircle className="size-4" aria-hidden="true" />
        Nudge
      </a>
    );
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(nudge.text);
    toast.success("Message copied — paste into WhatsApp.");
  }

  return (
    <button className={className} type="button" onClick={copyMessage}>
      <MessageCircle className="size-4" aria-hidden="true" />
      Nudge
    </button>
  );
}
