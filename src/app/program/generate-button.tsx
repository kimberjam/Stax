"use client";

import { useTransition } from "react";
import { generateProgram } from "./actions";

export function GenerateButton({
  children,
  className,
  pendingLabel = "Building your program…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-busy={pending}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await generateProgram();
        })
      }
      className={className}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
