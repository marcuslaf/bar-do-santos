import type { Metadata } from "next";
import Link from "next/link";

import { IconArrowLeft } from "@/components/ui/icons";
import { getSession } from "@/lib/data";
import { formatPhone } from "@/lib/phone";

import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = {
  title: "Minha senha",
};

export default async function MyPasswordPage() {
  const session = await getSession();
  if (!session) return null;

  const phone = session.phone ? formatPhone(session.phone) : null;

  return (
    <div>
      {/*
       * Mesmo desenho de cabeçalho de `/nova`: em altura curta (celular
       * deitado, tablet de balcão) "Voltar" e o título dividem uma linha e a
       * linha de apoio some — é o que devolve altura para o botão de trocar a
       * senha caber sem rolagem em 568×320.
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
          Minha senha
        </h1>
      </div>

      <p className="mt-1.5 text-[13px] text-ink-soft [@media(max-height:30rem)]:hidden">
        {phone ? (
          <>
            Você entra com o celular{" "}
            <span className="whitespace-nowrap">{phone}</span>.
          </>
        ) : (
          "A senha do seu acesso ao bar."
        )}
      </p>

      <ChangePasswordForm
        phone={session.phone}
        displayName={session.displayName}
        orgName={session.orgName}
      />
    </div>
  );
}
