"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBill } from "@/app/actions/bills";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ReceiptPreview } from "@/components/ReceiptPreview";
import { SnapReceiptButton, type SnapResult } from "@/components/SnapReceiptButton";
import { toCents, toRm } from "@/lib/money";
import { createBillSchema, type CreateBillInput } from "@/lib/validation";
import { cn } from "@/lib/utils";

type ParticipantRow = {
  key: string;
  name: string;
  phone: string;
};

type FormErrors = {
  title?: string;
  totalRm?: string;
  dueDate?: string;
  description?: string;
  participants?: string;
  participantNames: Record<string, string>;
  participantPhones: Record<string, string>;
};

type FormState = {
  title: string;
  totalRm: string;
  dueDate: string;
  description: string;
  participants: ParticipantRow[];
  receiptKey: string | null;
  receiptMime: string | null;
  receiptUploadedAt: number | null;
  receiptPreviewUrl: string | null;
};

const MAX_PARTICIPANTS = 50;

const INITIAL_PARTICIPANTS: ParticipantRow[] = [
  { key: "participant-1", name: "", phone: "" },
  { key: "participant-2", name: "", phone: "" },
];

function emptyErrors(): FormErrors {
  return {
    participantNames: {},
    participantPhones: {},
  };
}

function nextParticipantKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `participant-${Date.now()}`;
}

function validateForm(state: FormState): { input: CreateBillInput | null; errors: FormErrors } {
  const errors = emptyErrors();
  let totalCents = 0;

  try {
    totalCents = toCents(state.totalRm);
  } catch {
    errors.totalRm = "Enter an amount like 42.50.";
  }

  const candidate = {
    title: state.title,
    totalCents,
    dueDate: state.dueDate,
    description: state.description,
    participants: state.participants.map((participant) => ({
      name: participant.name,
      phone: participant.phone,
    })),
    receiptKey: state.receiptKey ?? undefined,
    receiptMime: state.receiptMime ?? undefined,
    receiptUploadedAt: state.receiptUploadedAt ?? undefined,
  };

  const parsed = createBillSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const [field, index, childField] = issue.path;

      if (field === "title") {
        errors.title = "Bill title is required.";
      }
      if (field === "totalCents" && !errors.totalRm) {
        errors.totalRm = "Amount must be more than RM 0.";
      }
      if (field === "dueDate") {
        errors.dueDate = "That date doesn't look right.";
      }
      if (field === "description") {
        errors.description = "Notes can't exceed 500 characters.";
      }
      if (field === "participants" && typeof index !== "number") {
        errors.participants = issue.message;
      }
      if (field === "participants" && typeof index === "number") {
        const row = state.participants[index];
        if (!row) {
          continue;
        }
        if (childField === "name") {
          errors.participantNames[row.key] = "Name is required.";
        }
        if (childField === "phone") {
          errors.participantPhones[row.key] = "Phone format: +60123456789";
        }
      }
    }
  }

  return {
    input: parsed.success && !errors.totalRm ? parsed.data : null,
    errors,
  };
}

function FieldError({ children, id }: { children?: string; id: string }) {
  if (!children) {
    return null;
  }

  return (
    <p id={id} className="text-[0.8rem] leading-5 text-sambal">
      {children}
    </p>
  );
}

export function CreateBillForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<FormState>({
    title: "",
    totalRm: "",
    dueDate: "",
    description: "",
    participants: INITIAL_PARTICIPANTS,
    receiptKey: null,
    receiptMime: null,
    receiptUploadedAt: null,
    receiptPreviewUrl: null,
  });

  const validation = useMemo(() => validateForm(state), [state]);

  function touch(field: string) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function shouldShow(field: string) {
    return showAllErrors || touched[field];
  }

  function updateField(
    field: "title" | "totalRm" | "dueDate" | "description",
    value: string,
  ) {
    setServerError(null);
    setState((current) => ({ ...current, [field]: value }));
  }

  function handleSnap(result: SnapResult) {
    setServerError(null);
    setState((current) => {
      const next: FormState = {
        ...current,
        receiptKey: result.receiptKey,
        receiptMime: result.receiptMime,
        receiptUploadedAt: result.receiptUploadedAt,
        receiptPreviewUrl: result.localPreviewUrl ?? current.receiptPreviewUrl,
      };
      const ocr = result.ocr;
      if (ocr?.restaurantName && !current.title.trim()) {
        next.title = ocr.restaurantName;
      }
      if (ocr?.totalCents != null && !current.totalRm.trim()) {
        next.totalRm = toRm(ocr.totalCents);
      }
      return next;
    });
    if (result.ocr?.restaurantName) touch("title");
    if (result.ocr?.totalCents != null) touch("totalRm");
  }

  function updateParticipant(key: string, field: "name" | "phone", value: string) {
    setServerError(null);
    setState((current) => ({
      ...current,
      participants: current.participants.map((participant) =>
        participant.key === key ? { ...participant, [field]: value } : participant,
      ),
    }));
  }

  function addParticipant() {
    setState((current) => {
      if (current.participants.length >= MAX_PARTICIPANTS) {
        return current;
      }

      return {
        ...current,
        participants: [
          ...current.participants,
          { key: nextParticipantKey(), name: "", phone: "" },
        ],
      };
    });
  }

  function removeParticipant(key: string) {
    setState((current) => {
      if (current.participants.length <= 1) {
        return current;
      }

      return {
        ...current,
        participants: current.participants.filter((participant) => participant.key !== key),
      };
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowAllErrors(true);
    setServerError(null);

    const { input } = validateForm(state);
    if (!input) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await createBill(input);
        router.replace("/created/" + result.id + "#k=" + encodeURIComponent(result.adminSecret));
      } catch (error) {
        setServerError(error instanceof Error ? error.message : "Couldn't create the bill. Try again.");
      }
    });
  }

  const participantCount = state.participants.length;
  const participantLimitHit = participantCount >= MAX_PARTICIPANTS;

  return (
    <Card className="rounded-lg border border-ink/10 bg-paper-soft/92 shadow-[0_18px_50px_rgb(59_42_30_/_0.12)]">
      <CardHeader className="border-b border-dashed border-ink/20 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="font-display text-2xl font-semibold text-ink">
              Create a bill
            </CardTitle>
            <p className="text-sm leading-6 text-ink/70">Fill it in, share the link in seconds.</p>
          </div>
          <div className="rounded-md border border-ink/15 px-2 py-1 font-mono text-xs font-semibold uppercase text-teh">
            Receipt
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" noValidate onSubmit={handleSubmit}>
          <SnapReceiptButton onSnap={handleSnap} disabled={isPending} />
          {state.receiptPreviewUrl ? (
            <ReceiptPreview
              src={state.receiptPreviewUrl}
              uploadedAt={state.receiptUploadedAt}
              label={state.receiptKey ? "Receipt attached" : "Receipt preview (not yet attached)"}
            />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="bill-title">Bill title</Label>
            <Input
              id="bill-title"
              aria-describedby="bill-title-error"
              aria-invalid={Boolean(shouldShow("title") && validation.errors.title)}
              className="min-h-11 bg-paper text-ink placeholder:text-ink/45"
              maxLength={120}
              placeholder="Coffee after football"
              value={state.title}
              onBlur={() => touch("title")}
              onChange={(event) => updateField("title", event.target.value)}
            />
            <FieldError id="bill-title-error">
              {shouldShow("title") ? validation.errors.title : undefined}
            </FieldError>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_0.9fr]">
            <div className="space-y-2">
              <Label htmlFor="bill-total">Total (RM)</Label>
              <Input
                id="bill-total"
                aria-describedby="bill-total-error"
                aria-invalid={Boolean(shouldShow("totalRm") && validation.errors.totalRm)}
                className="min-h-11 bg-paper font-mono text-ink placeholder:text-ink/45"
                inputMode="decimal"
                placeholder="88.40"
                value={state.totalRm}
                onBlur={() => touch("totalRm")}
                onChange={(event) => updateField("totalRm", event.target.value)}
              />
              <FieldError id="bill-total-error">
                {shouldShow("totalRm") ? validation.errors.totalRm : undefined}
              </FieldError>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bill-due-date">Due date</Label>
              <Input
                id="bill-due-date"
                aria-describedby="bill-due-date-error"
                aria-invalid={Boolean(shouldShow("dueDate") && validation.errors.dueDate)}
                className="min-h-11 bg-paper text-ink"
                type="date"
                value={state.dueDate}
                onBlur={() => touch("dueDate")}
                onChange={(event) => updateField("dueDate", event.target.value)}
              />
              <FieldError id="bill-due-date-error">
                {shouldShow("dueDate") ? validation.errors.dueDate : undefined}
              </FieldError>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bill-description">Notes (optional)</Label>
            <Textarea
              id="bill-description"
              aria-describedby="bill-description-error"
              aria-invalid={Boolean(shouldShow("description") && validation.errors.description)}
              className="min-h-24 resize-none bg-paper text-ink placeholder:text-ink/45"
              maxLength={500}
              placeholder="Back table — order extra side of curry."
              value={state.description}
              onBlur={() => touch("description")}
              onChange={(event) => updateField("description", event.target.value)}
            />
            <FieldError id="bill-description-error">
              {shouldShow("description") ? validation.errors.description : undefined}
            </FieldError>
          </div>

          <div className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1">
                <Label>Participants</Label>
                <p className="text-xs text-ink/60">{participantCount} of 50 splitting this bill.</p>
              </div>
              <Button
                className="min-h-11 gap-2 border-ink/20 bg-paper text-ink hover:bg-accent"
                disabled={participantLimitHit || isPending}
                type="button"
                variant="outline"
                onClick={addParticipant}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add person
              </Button>
            </div>

            <div className="space-y-3">
              {state.participants.map((participant, index) => {
                const nameField = `participant-${participant.key}-name`;
                const phoneField = `participant-${participant.key}-phone`;
                const nameTouched = `participants.${participant.key}.name`;
                const phoneTouched = `participants.${participant.key}.phone`;
                const nameError = validation.errors.participantNames[participant.key];
                const phoneError = validation.errors.participantPhones[participant.key];

                return (
                  <div
                    className="rounded-lg border border-ink/10 bg-paper/80 p-3"
                    key={participant.key}
                  >
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_44px]">
                      <div className="space-y-2">
                        <Label className="text-xs text-ink/70" htmlFor={nameField}>
                          Name {index + 1}
                        </Label>
                        <Input
                          id={nameField}
                          aria-describedby={`${nameField}-error`}
                          aria-invalid={Boolean(shouldShow(nameTouched) && nameError)}
                          className="min-h-11 bg-paper-soft text-ink placeholder:text-ink/45"
                          maxLength={64}
                          placeholder="Alex"
                          value={participant.name}
                          onBlur={() => touch(nameTouched)}
                          onChange={(event) =>
                            updateParticipant(participant.key, "name", event.target.value)
                          }
                        />
                        <FieldError id={`${nameField}-error`}>
                          {shouldShow(nameTouched) ? nameError : undefined}
                        </FieldError>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-ink/70" htmlFor={phoneField}>
                          Phone
                        </Label>
                        <Input
                          id={phoneField}
                          aria-describedby={`${phoneField}-error`}
                          aria-invalid={Boolean(shouldShow(phoneTouched) && phoneError)}
                          className="min-h-11 bg-paper-soft text-ink placeholder:text-ink/45"
                          inputMode="tel"
                          placeholder="+60123456789"
                          value={participant.phone}
                          onBlur={() => touch(phoneTouched)}
                          onChange={(event) =>
                            updateParticipant(participant.key, "phone", event.target.value)
                          }
                        />
                        <FieldError id={`${phoneField}-error`}>
                          {shouldShow(phoneTouched) ? phoneError : undefined}
                        </FieldError>
                      </div>

                      <Button
                        aria-label={`Remove person ${index + 1}`}
                        className={cn(
                          "min-h-11 min-w-11 self-end border-ink/20 bg-paper text-ink hover:bg-accent",
                          participantCount <= 1 && "opacity-40",
                        )}
                        disabled={participantCount <= 1 || isPending}
                        size="icon"
                        type="button"
                        variant="outline"
                        onClick={() => removeParticipant(participant.key)}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <FieldError id="participants-error">
              {showAllErrors ? validation.errors.participants : undefined}
            </FieldError>
          </div>

          {serverError ? (
            <p className="rounded-lg border border-sambal/30 bg-sambal/10 px-3 py-2 text-sm text-sambal">
              {serverError}
            </p>
          ) : null}

          <Button
            className="min-h-12 w-full bg-teh px-4 text-base font-semibold text-ink shadow-[0_8px_0_rgb(59_42_30_/_0.14)] hover:bg-teh/90"
            disabled={isPending}
            type="submit"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Create bill
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
