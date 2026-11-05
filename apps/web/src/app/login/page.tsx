import type { Metadata } from "next";

import { BrandLockup } from "@/components/app-shell/brand-lockup";
import { BrandSign } from "@/components/app-shell/brand-sign";
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
 * segunda coluna. Aí o rodapé sai — são 52px que devolvem o botão Entrar à dobra
 * em 568×320 e 480×320 sem mexer na altura dos campos.
 *
 * A assinatura depende da largura, não da orientação: abaixo de 768px — e em
 * qualquer largura quando a altura fica em 480px ou menos — a marca é o
 * `BrandLockup` (caderninho + "Bar do Santos" em Bitter + legenda de 13px). A
 * placa vermelha só entra com >= 768px de largura e altura > 480px, onde há
 * espaço ao lado do card; ali ela é o único serifado grande e "Pedidos" desce a
 * etiqueta de 13px. Motivo medida: em 320×568 a placa ocupa 90px de altura e o
 * estado de erro de senha precisa de 69px — não existe arranjo que caiba os
 * dois, e o "Entrar" fica fora da dobra (45 dos 52px). O lockup devolve o botão
 * à dobra e, no celular deitado, faz o nome do bar aparecer — antes ele sumia.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col justify-center bg-paper px-4 pt-[calc(0.75rem_+_env(safe-area-inset-top))] pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] sm:px-6 md:px-8 [@media(max-height:30rem)]:pt-[calc(0.5rem_+_env(safe-area-inset-top))] [@media(max-height:30rem)]:pb-[calc(0.5rem_+_env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-sm sm:max-w-3xl lg:max-w-5xl">
        <div className="sm:grid sm:grid-cols-[auto_auto] sm:items-start sm:justify-center sm:gap-8 md:gap-12 lg:gap-16">
          {/* Marca: linha no celular em pé; coluna à esquerda de 640px para cima. */}
          <div className="mb-4 [@media(max-height:30rem)]:mb-1.5 [@media(max-height:22rem)]:mb-0! sm:mb-0">
            {/*
             * Lockup vetorial: tudo abaixo de 768px de largura e qualquer tela
             * com 480px de altura ou menos. É a assinatura única nesses tiers —
             * 40px de marca em vez de 90px de placa, o que mantém o "Entrar" na
             * dobra mesmo com a mensagem de senha incorreta.
             */}
            <BrandLockup className="[@media(min-width:48rem)_and_(min-height:30.01rem)]:hidden" />

            {/*
             * A placa só existe com largura e altura sobrando (>= 768px e altura
             * > 480px): no celular em pé ela custava os 69px que faltam ao estado
             * de erro. Largura limitada pelo espaço que sobra ao lado do card —
             * 224px em 768, 352px no desktop.
             */}
            <BrandSign className="mb-2 hidden [@media(min-width:48rem)_and_(min-height:30.01rem)]:block sm:mb-3 sm:w-[11rem] md:w-[14rem] lg:w-[22rem]" />

            {/*
             * Etiqueta sob a placa: só no tier alto, onde a placa é o único
             * serifado grande. 13px porque "Pedidos" compete com o nome do bar
             * se subir ao tamanho de headline — a hierarquia é da placa.
             */}
            <p className="mt-2 hidden text-[13px] leading-tight text-ink-soft [@media(min-width:48rem)_and_(min-height:30.01rem)]:block sm:mt-3">
              Pedidos · Caderno da equipe
            </p>
          </div>

          {/*
           * Largura do card: 336px na faixa de duas colunas sem a placa (640–767).
           * O lockup pede 219px e o gap 32px, então 380px de card estourava os
           * 592px úteis de 640 e o "Bar do Santos" quebrava em duas linhas. De
           * 768px para cima a placa é a coluna da esquerda e o card volta a 420.
           */}
          <div className="w-full max-w-full sm:w-[336px] md:w-[420px] lg:w-[456px]">
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
              className="mt-6 text-center text-[13px] leading-relaxed text-ink-soft [@media(min-height:30.01rem)_and_(max-height:36rem)]:mt-2 [@media(max-width:39.99rem)_and_(max-height:26rem)]:hidden [@media(max-height:22rem)]:hidden [@media(max-height:30rem)]:mt-1.5 sm:mt-7"
            >
              Sem acesso? Peça ao dono para criar o seu.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
