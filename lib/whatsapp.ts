import { formatRm } from "@/lib/money";

type NudgeMessageInput = {
  name: string;
  amountCents: number;
  billTitle: string;
  publicUrl: string;
};

type NudgeUrlInput = NudgeMessageInput & {
  phone?: string | null;
};

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

export function buildNudgeMessage({
  name,
  amountCents,
  billTitle,
  publicUrl,
}: NudgeMessageInput): string {
  return `Hey ${name}, you still owe ${formatRm(
    amountCents,
  )} for "${billTitle}" — settle here: ${publicUrl}`;
}

export function buildNudgeUrl(input: NudgeUrlInput): { wa?: string; text: string } {
  const text = buildNudgeMessage(input);
  const normalizedPhone = normalizePhone(input.phone);

  if (!normalizedPhone) {
    return { text };
  }

  return {
    wa: `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`,
    text,
  };
}
