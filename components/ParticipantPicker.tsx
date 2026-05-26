"use client";

import { useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Participant } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRm } from "@/lib/money";
import { transitionalNavigate } from "@/lib/view-transitions";

type PickerParticipant = Pick<Participant, "id" | "name" | "amountCents">;

type ParticipantPickerProps = {
  billId: string;
  participants: PickerParticipant[];
};

function memberPath(billId: string, participantId: string) {
  return `/b/${encodeURIComponent(billId)}/me/${encodeURIComponent(participantId)}`;
}

export function ParticipantPicker({ billId, participants }: ParticipantPickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const storageKey = useMemo(() => `kira-kira:${billId}`, [billId]);

  useEffect(() => {
    let savedParticipantId: string | null = null;

    try {
      savedParticipantId = window.localStorage.getItem(storageKey);
    } catch {
      savedParticipantId = null;
    }

    if (savedParticipantId) {
      startTransition(() => {
        transitionalNavigate(router, memberPath(billId, savedParticipantId), "replace");
      });
    }
  }, [billId, router, storageKey]);

  function pickParticipant(participantId: string) {
    try {
      window.localStorage.setItem(storageKey, participantId);
    } catch {
      // localStorage can be unavailable in private browsing; routing still works.
    }

    startTransition(() => {
      transitionalNavigate(router, memberPath(billId, participantId), "push");
    });
  }

  return (
    <Card className="rounded-lg border border-ink/10 bg-paper-soft/95 shadow-[0_14px_34px_rgb(59_42_30_/_0.10)]">
      <CardHeader className="border-b border-dashed border-ink/20 pb-4">
        <CardTitle className="font-display text-2xl font-semibold text-ink">
          Pick your name
        </CardTitle>
        <p className="text-sm leading-6 text-ink/70">Tap your name to mark yourself paid.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {participants.map((participant) => (
          <Button
            className="min-h-14 w-full justify-between gap-3 border-ink/15 bg-paper px-3 text-left text-ink hover:bg-accent"
            disabled={isPending}
            key={participant.id}
            type="button"
            variant="outline"
            onClick={() => pickParticipant(participant.id)}
          >
            <span className="min-w-0 break-words text-base font-semibold leading-6">
              {participant.name}
            </span>
            <span className="shrink-0 font-mono text-sm font-semibold text-ink/65">
              {formatRm(participant.amountCents)}
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
