import type { Metadata } from "next";

import { BrandMark } from "@/components/app-shell/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
};

/*
 * Duas composições, um só DOM:
 * - < 640px .......... uma coluna (marca acima, formulário abaixo);
 * - >= 640px ......... marca à esquerda, formulário à direita — deita o
 *                      celular/tablet e o conjunto ganha largura em vez de
 *                      altura, que é o recurso escasso.
 *
 * O botão de tema segue o header do app: canto direito. No celular em pé e
 * nas telas baixas (deitado) fica in-flow na linha da marca; com >= 640px de
 * largura E altura ele vira absoluto no canto superior direito da página.
 *
 * `max-height: 30rem` (480px) é o modo "curto": celular e tablet deitados, onde
 * o botão Entrar precisa estar na dobra. Nesse modo só o ritmo vertical encolhe
 * (paddings, gaps, alturas de campo); a escala tipográfica fica intacta para o
 * formulário não parecer um celular espremido numa tela larga, e os alvos de
 * toque continuam >= 44px.
 */
export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col justify-center bg-paper px-4 pt-[calc(2.5rem_+_env(safe-area-inset-top))] pb-[calc(2.5rem_+_env(safe-area-inset-bottom))] sm:px-6 md:px-8 [@media(max-height:30rem)]:pt-[calc(0.5rem_+_env(safe-area-inset-top))] [@media(max-height:30rem)]:pb-[calc(0.5rem_+_env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-sm sm:max-w-3xl lg:max-w-5xl">
        <div className="sm:grid sm:grid-cols-[auto_auto] sm:items-start sm:justify-center sm:gap-8 md:gap-12 lg:gap-16">
          {/* Marca: linha no celular em pé; coluna à esquerda de 640px para cima. */}
          <div className="mb-7 flex items-center justify-between gap-3 [@media(max-height:30rem)]:mb-1.5 sm:mb-0">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <BrandMark className="h-12 w-12 shrink-0 rounded-xl [@media(max-height:30rem)]:h-9 [@media(max-height:30rem)]:w-9 [@media(max-height:30rem)]:rounded-lg md:h-14 md:w-14 lg:h-16 lg:w-16" />
              <div className="min-w-0">
                <p className="font-display text-[24px] leading-none text-ink md:text-[30px] lg:text-[34px]">
                  Pedidos
                </p>
                <p className="mt-1.5 text-[13px] leading-none text-ink-soft [@media(max-height:30rem)]:mt-1 md:mt-2.5 md:text-[15px]">
                  Caderno da equipe
                </p>
              </div>
            </div>
            {/*
             * Tema. Um só botão, dois comportamentos por media query:
             * - in-flow na linha da marca: celular em pé e telas baixas
             *   (celular/tablet deitado), onde qualquer canto da página
             *   colidiria com o card — no fluxo não há colisão possível;
             * - absoluto no canto superior direito da PÁGINA quando >= 640px
             *   de largura E >= 640px de altura: nessa faixa a composição é
             *   centralizada com folga >= 95px no topo (medido), espelhando a
             *   posição que o botão ocupa no header do app logado.
             *
             * `top/right` são inertes enquanto o elemento está in-flow.
             */}
            <div className="shrink-0 top-[calc(2.5rem_+_env(safe-area-inset-top))] right-4 sm:right-6 md:right-8 [@media(min-width:40rem)_and_(min-height:40rem)]:absolute">
              <ThemeToggle />
            </div>
          </div>

          <div className="w-full max-w-full sm:w-[380px] md:w-[420px] lg:w-[456px]">
            <div
              data-login-card
              className="rounded-2xl border border-line bg-surface p-5 shadow-card [@media(max-height:30rem)]:p-2.5 sm:p-6 lg:p-7"
            >
              <h1 className="font-display text-[22px] leading-tight text-ink sm:text-[26px]">
                Entrar
              </h1>
              <p className="mt-1 text-[14px] leading-snug text-ink-soft [@media(max-height:30rem)]:mt-0.5 sm:text-[15px]">
                Use o acesso criado pelo dono do bar.
              </p>

              <LoginForm />
            </div>

            <p
              data-login-footer
              className="mt-6 text-center text-[13px] leading-relaxed text-ink-soft [@media(max-height:30rem)]:mt-1.5 sm:mt-7"
            >
              Sem acesso? Peça ao dono para criar o seu.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
