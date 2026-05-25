const RM_PATTERN = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

function assertCents(cents: number) {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error("Invalid cents amount");
  }
}

export function toCents(rm: string): number {
  const trimmed = rm.trim();
  if (!RM_PATTERN.test(trimmed)) {
    throw new Error("Invalid RM amount");
  }

  const [ringgit = "0", sen = ""] = trimmed.split(".");
  const centsText = sen.padEnd(2, "0");
  const cents = Number.parseInt(ringgit, 10) * 100 + Number.parseInt(centsText, 10);

  if (cents <= 0) {
    throw new Error("Invalid RM amount");
  }

  return cents;
}

export function toRm(cents: number): string {
  assertCents(cents);

  const ringgit = Math.floor(cents / 100);
  const sen = String(cents % 100).padStart(2, "0");
  return `${ringgit}.${sen}`;
}

export function formatRm(cents: number): string {
  return `RM ${toRm(cents)}`;
}
