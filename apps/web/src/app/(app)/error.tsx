"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { IconAlert } from "@/components/ui/icons";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-2xl border border-line bg-surface px-5 py-8 text-center">
      <span
        aria-hidden="true"
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger"
      >
        <IconAlert size={24} />
      </span>
      <h1 className="mt-3 font-display text-[21px] text-ink">
        Não foi possível carregar
      </h1>
      <p className="mx-auto mt-1.5 max-w-[38ch] text-[15px] leading-relaxed text-ink-soft">
        Verifique a conexão e tente de novo. Se continuar, avise o responsável
        pelo sistema.
      </p>
      <div className="mt-5 flex justify-center">
        <Button onClick={reset} variant="secondary">
          Tentar de novo
        </Button>
      </div>
    </div>
  );
}
