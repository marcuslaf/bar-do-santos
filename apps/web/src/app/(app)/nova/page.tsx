import type { Metadata } from "next";
import Link from "next/link";

import { IconArrowLeft } from "@/components/ui/icons";

import { NewNoteForm } from "./new-note-form";

export const metadata: Metadata = {
  title: "Nova nota",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawError = Array.isArray(params.erro) ? params.erro[0] : params.erro;
  const initialError = rawError ? rawError.slice(0, 200) : null;

  return (
    <div>
      {/*
       * Em altura curta (tablet deitado) e na tela mais estreita (320px) o
       * cabeçalho da página e o título viram uma linha só, devolvendo 44px de
       * altura para os campos; em pé, no resto dos tamanhos, mantém o
       * empilhado do caderno.
       */}
      <div className="flex flex-col [@media(max-height:30rem)]:flex-row [@media(max-height:30rem)]:items-center [@media(max-height:30rem)]:gap-3 [@media(max-width:22.5rem)]:flex-row [@media(max-width:22.5rem)]:items-center [@media(max-width:22.5rem)]:gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg pr-2 text-[14px] text-ink-soft transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <IconArrowLeft size={18} />
          Voltar
        </Link>

        <h1 className="mt-1 font-display text-[27px] leading-tight text-ink [@media(max-height:30rem)]:mt-0 [@media(max-height:30rem)]:text-[22px] [@media(max-width:22.5rem)]:mt-0 [@media(max-width:22.5rem)]:text-[24px]">
          Nova nota
        </h1>
      </div>

      <p className="mt-1.5 text-[13px] text-ink-soft [@media(max-height:30rem)]:hidden [@media(max-width:22.5rem)]:hidden">
        Nome do cliente, pedido e salvar. O valor é opcional.
      </p>

      <NewNoteForm initialError={initialError} />
    </div>
  );
}
