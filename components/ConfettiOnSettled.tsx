"use client";

import { useEffect } from "react";

type ConfettiOnSettledProps = {
  billId: string;
  percent: number;
};

const firedWithoutStorage = new Set<string>();

export function ConfettiOnSettled({ billId, percent }: ConfettiOnSettledProps) {
  useEffect(() => {
    if (percent !== 100) {
      return;
    }

    const storageKey = `confetti:${billId}`;

    try {
      if (window.sessionStorage.getItem(storageKey)) {
        return;
      }

      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      if (firedWithoutStorage.has(storageKey)) {
        return;
      }

      firedWithoutStorage.add(storageKey);
    }

    let cancelled = false;

    void import("canvas-confetti")
      .then(({ default: confetti }) => {
        if (cancelled) {
          return;
        }

        confetti({
          particleCount: 140,
          spread: 72,
          origin: { y: 0.68 },
          colors: ["#D88A3F", "#5C8A4A", "#F7EFE2", "#C24B3A"],
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [billId, percent]);

  return null;
}
