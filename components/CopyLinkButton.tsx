"use client";

import { Copy, KeyRound, LinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WhatsAppShareButton } from "@/components/WhatsAppShareButton";
import { formatRm } from "@/lib/money";

type CopyLinkButtonProps = {
  url: string;
  disabled?: boolean;
};

type CreatedClientProps = {
  billId: string;
  title: string;
  totalCents: number;
};

function adminSecretFromHash(hash: string) {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return params.get("k") ?? "";
}

export function CopyLinkButton({ url, disabled = false }: CopyLinkButtonProps) {
  async function copyUrl() {
    await navigator.clipboard.writeText(url);
    toast.success("Dah salin!");
  }

  return (
    <Button
      className="min-h-11 gap-2 bg-teh text-ink hover:bg-teh/90"
      disabled={disabled}
      type="button"
      onClick={copyUrl}
    >
      <Copy className="size-4" aria-hidden="true" />
      Salin link
    </Button>
  );
}

export function CreatedClient({ billId, title, totalCents }: CreatedClientProps) {
  const [origin, setOrigin] = useState("");
  const [adminSecret, setAdminSecret] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    setAdminSecret(adminSecretFromHash(window.location.hash));
  }, []);

  const publicUrl = `${origin}/b/${billId}`;
  const adminUrl = `${origin}/b/${billId}/admin?k=${encodeURIComponent(adminSecret)}`;

  return (
    <div className="space-y-4">
      <Card className="rounded-lg border border-ink/10 bg-paper-soft">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-teh/20 text-teh">
              <KeyRound className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="font-display text-xl text-ink">Link admin</CardTitle>
              <CardDescription className="text-ink/65">
                Simpan untuk tengok siapa dah settle.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="break-all rounded-md border border-dashed border-ink/20 bg-paper px-3 py-3 font-mono text-[0.78rem] leading-5 text-ink">
            {adminUrl}
          </p>
          <CopyLinkButton disabled={!adminSecret} url={adminUrl} />
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-ink/10 bg-paper-soft">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-lime/15 text-lime">
              <LinkIcon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="font-display text-xl text-ink">Link geng</CardTitle>
              <CardDescription className="text-ink/65">
                Share dalam WhatsApp group.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="break-all rounded-md border border-dashed border-ink/20 bg-paper px-3 py-3 font-mono text-[0.78rem] leading-5 text-ink">
            {publicUrl}
          </p>
          <CopyLinkButton url={publicUrl} />
        </CardContent>
      </Card>

      <div className="rounded-lg border border-dashed border-ink/15 bg-paper-soft/70 p-4">
        <p className="mb-3 font-mono text-sm text-ink/70">
          {title} · {formatRm(totalCents)}
        </p>
        <WhatsAppShareButton billTitle={title} publicUrl={publicUrl} totalCents={totalCents} />
      </div>
    </div>
  );
}
