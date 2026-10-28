import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AccountLink } from "@/components/app-shell/account-link";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { HeaderNav } from "@/components/app-shell/header-nav";
import { SignOutButton } from "@/components/app-shell/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  /*
   * getSession() nulo tem duas causas possíveis e cada uma pede um destino
   * diferente — misturar as duas era o que criava o loop /login → / → /login:
   *
   * - sem usuário logado  → /login (o middleware também cobre, mas o redirect
   *   explícito mantém a regra legível aqui);
   * - usuário logado sem linha ativa em org_members → /sem-acesso, tela
   *   informativa fora do grupo (app), com saída para a conta.
   */
  if (!session) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    redirect(user ? "/sem-acesso" : "/login");
  }

  const roleLabel = session.role === "owner" ? "Dono" : "Equipe";
  const displayName = session.displayName.trim();
  // Evita "Dono · Dono" quando o nome cadastrado é o próprio rótulo do papel.
  const subtitle =
    displayName === "" || displayName.toLowerCase() === roleLabel.toLowerCase()
      ? roleLabel
      : `${displayName} · ${roleLabel}`;

  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3 focus:text-ink"
      >
        Pular para o conteúdo
      </a>

      <header className="sticky top-0 z-20 border-b border-line bg-paper/92 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4 [@media(max-height:30rem)]:h-12">
          {/*
           * O bloco de identidade é também a entrada da conta: em 320px o
           * header comporta dois controles à direita (tema + "Sair"), e é este
           * bloco — 44px de alvo, sem largura nova — que leva a /minha-senha.
           * A linha "Nome · Papel" deixou de sumir em altura curta: ela é a
           * affordance do link, não sobra de layout.
           */}
          <div className="flex min-w-0 flex-1 items-center">
            <AccountLink orgName={session.orgName} subtitle={subtitle} />
          </div>

          <HeaderNav role={session.role} />

          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      {/*
       * Container único do app (768px): header, conteúdo e CTA flutuante
       * compartilham a mesma coluna. No celular a coluna é a tela inteira; no
       * desktop para de esticar e o `<main>` reserva só o espaço da barra
       * inferior que existe no celular.
       */}
      <main
        id="conteudo"
        className="mx-auto w-full max-w-3xl px-4 pt-4 pb-[calc(6rem_+_env(safe-area-inset-bottom))] [@media(max-height:30rem)]:pt-3 [@media(max-height:30rem)]:pb-[calc(4.5rem_+_env(safe-area-inset-bottom))] md:pb-12"
      >
        {children}
      </main>

      <BottomNav role={session.role} />
    </div>
  );
}
