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
 * O botão de tema vive no cabeçalho do card, à direita do título — a mesma
 * posição em qualquer viewport (celular, tablet deitado, desktop). É a única
 * posição ancorada em algo em todas as faixas: na linha da marca ele espremia
 * a coluna e quebrava "Caderno da equipe" em 667px de largura, e solto no canto
 * da página ficava 560px longe do card em 1920px.
 *
 * `max-height: 30rem` (480px) é o modo "curto": celular e tablet deitados, onde
 * o botão Entrar precisa estar na dobra. Nesse modo só o ritmo vertical encolhe
 * (paddings, gaps, alturas de campo); a escala tipográfica fica intacta para o
 * formulário não parecer um celular espremido numa tela larga, e os alvos de
 * toque continuam >= 44px.
 *
 * `max-height: 22rem` (352px) é o modo "muito curto": telefone deitado em que a
 * largura ainda fica abaixo de 640px, então a composição não pode ganhar uma
 * segunda coluna. Aí a marca vira um selo compacto (logo e wordmark menores,
 * sem subtítulo) e o rodapé sai — são 52px que devolvem o botão Entrar à dobra
 * em 568×320 e 480×320 sem mexer na altura dos campos.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col justify-center bg-paper px-4 pt-[calc(2.5rem_+_env(safe-area-inset-top))] pb-[calc(2.5rem_+_env(safe-area-inset-bottom))] sm:px-6 md:px-8 [@media(max-height:30rem)]:pt-[calc(0.5rem_+_env(safe-area-inset-top))] [@media(max-height:30rem)]:pb-[calc(0.5rem_+_env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-sm sm:max-w-3xl lg:max-w-5xl">
        <div className="sm:grid sm:grid-cols-[auto_auto] sm:items-start sm:justify-center sm:gap-8 md:gap-12 lg:gap-16">
          {/* Marca: linha no celular em pé; coluna à esquerda de 640px para cima. */}
          <div className="mb-7 flex items-center gap-3 [@media(max-height:30rem)]:mb-1.5 [@media(max-height:22rem)]:mb-0! sm:mb-0">
            <BrandMark className="h-12 w-12 shrink-0 rounded-xl [@media(max-height:30rem)]:h-9 [@media(max-height:30rem)]:w-9 [@media(max-height:30rem)]:rounded-lg [@media(max-height:22rem)]:h-7! [@media(max-height:22rem)]:w-7! md:h-14 md:w-14 lg:h-16 lg:w-16" />
            <div className="min-w-0">
              <p className="font-display text-[24px] leading-none text-ink [@media(max-height:22rem)]:text-[18px] md:text-[30px] lg:text-[34px]">
                Pedidos
              </p>
              <p className="mt-1.5 text-[13px] leading-none text-ink-soft [@media(max-height:30rem)]:mt-1 [@media(max-height:22rem)]:hidden md:mt-2.5 md:text-[15px]">
                Caderno da equipe
              </p>
            </div>
          </div>

          <div className="w-full max-w-full sm:w-[380px] md:w-[420px] lg:w-[456px]">
            <div
              data-login-card
              className="rounded-2xl border border-line bg-surface p-5 shadow-card [@media(max-height:30rem)]:p-2.5 [@media(max-height:22rem)]:p-2! sm:p-6 lg:p-7"
            >
              {/*
               * Cabeçalho do card: título à esquerda, tema à direita. O botão
               * não acrescenta altura em nenhum modo — a linha do título com o
               * subtítulo já é mais alta que os 44px do alvo.
               */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="font-display text-[22px] leading-tight text-ink [@media(max-height:22rem)]:text-[20px] sm:text-[26px]">
                    Entrar
                  </h1>
                  <p className="mt-1 text-[14px] leading-snug text-ink-soft [@media(max-height:30rem)]:mt-0.5 [@media(max-height:22rem)]:hidden sm:text-[15px]">
                    Use o acesso criado pelo dono do bar.
                  </p>
                </div>
                <div className="-mt-1 shrink-0 sm:-mt-1.5">
                  <ThemeToggle />
                </div>
              </div>

              <LoginForm />
            </div>

            <p
              data-login-footer
              className="mt-6 text-center text-[13px] leading-relaxed text-ink-soft [@media(max-width:39.99rem)_and_(max-height:26rem)]:hidden [@media(max-height:22rem)]:hidden [@media(max-height:30rem)]:mt-1.5 sm:mt-7"
            >
              Sem acesso? Peça ao dono para criar o seu.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
