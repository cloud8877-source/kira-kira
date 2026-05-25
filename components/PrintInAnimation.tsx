"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PrintInAnimationProps = {
  children: ReactNode;
  className?: string;
};

export function PrintInAnimation({ children, className }: PrintInAnimationProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <div
      className={cn(
        className,
        hasMounted &&
          "motion-safe:animate-[print-in_700ms_cubic-bezier(0.2,0.6,0.2,1)_both]",
      )}
    >
      {children}
    </div>
  );
}
