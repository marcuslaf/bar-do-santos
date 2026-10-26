import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/app-shell/brand-mark";
import { SignOutButton } from "@/components/app-shell/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { IconAlert } from "@/components/ui/icons";
import { labelClass } from "@/components/ui/styles";
import { getSession } from "@/lib/data";
import { phoneFromAuthEmail } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Acesso pendente",
  robots: { index: false, follow: false },
};

/**
 * Estado intermediário: login válido, mas sem vínculo ativo no bar.
 * Fica fora do grupo (app) para não herdar o shell e não depender de sessão
 * completa. Quem já foi liberado cai direto na lista.
 */
export default async function SemAcessoPage() {
  if (await getSession()) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sem usuário não há o que explicar: o caminho é entrar.
  if (!user) redirect("/login");

  const phone = phoneFromAuthEmail(user.email);

  return (
    <main className="flex min-h-dvh flex-col justify-center px-4 py-[calc(2.5rem_+_env(safe-area-inset-top))] [@media(max-height:30rem)]:py-[calc(1rem_+_env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-7 flex items-center justify-between gap-3 [@media(max-height:30rem)]:mb-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <div className="min-w-0">
              <p className="font-display text-[24px] leading-none text-ink">
                Pedidos
              </p>
              <p className="mt-1.5 text-[13px] leading-none text-ink-soft">
                Caderno da equipe
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6 [@media(max-height:30rem)]:p-4">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-warn-soft text-warn [@media(max-height:30rem)]:hidden"
          >
            <IconAlert size={22} />
          </span>

          <h1 className="mt-3.5 font-display text-[22px] leading-tight text-ink [@media(max-height:30rem)]:mt-0">
            Seu acesso ainda não foi liberado
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft [@media(max-height:30rem)]:mt-1.5">
            O login funcionou, mas esta conta ainda não está vinculada ao bar.
            Peça ao dono para criar o seu acesso na tela Equipe.
          </p>

          {phone ? (
            <div className="mt-4 rounded-xl border border-line bg-paper px-3.5 py-3 [@media(max-height:30rem)]:mt-3 [@media(max-height:30rem)]:flex [@media(max-height:30rem)]:items-baseline [@media(max-height:30rem)]:justify-between [@media(max-height:30rem)]:gap-3 [@media(max-height:30rem)]:py-2">
              <p className={labelClass}>Celular conectado</p>
              <p className="mt-1.5 text-[15px] font-medium break-all text-ink [@media(max-height:30rem)]:mt-0">
                {phone}
              </p>
            </div>
          ) : null}

          <div className="mt-5 [@media(max-height:30rem)]:mt-3">
            <SignOutButton variant="primary" size="lg" fullWidth />
          </div>
        </div>

        <p className="mt-6 text-center text-[13px] leading-relaxed text-ink-soft [@media(max-height:30rem)]:mt-4">
          Já foi liberado?{" "}
          <Link
            href="/"
            className="inline-flex min-h-11 items-center font-medium text-brand-ink underline underline-offset-2"
          >
            Tentar de novo
          </Link>
        </p>
      </div>
    </main>
  );
}
