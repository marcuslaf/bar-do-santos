import type { Metadata } from "next";

import { BrandMark } from "@/components/app-shell/brand-mark";
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
 * o botão Entrar precisa estar na dobra. Nesse modo o letreiro do bar sai de
 * cena (uma placa de 3,2:1 em 320px de largura tem 90px de altura, e são 90px
 * que o formulário não tem) e a marca vira a linha compacta de hoje: caderninho
 * + "Pedidos". Nesse modo só o ritmo vertical encolhe (paddings, gaps, alturas
 * de campo); a escala tipográfica fica intacta para o formulário não parecer um
 * celular espremido numa tela larga, e os alvos de toque continuam >= 44px.
 *
 * `max-height: 22rem` (352px) é o modo "muito curto": telefone deitado em que a
 * largura ainda fica abaixo de 640px, então a composição não pode ganhar uma
 * segunda coluna. Aí a marca vira um selo compacto (logo e wordmark menores,
 * sem subtítulo) e o rodapé sai — são 52px que devolvem o botão Entrar à dobra
 * em 568×320 e 480×320 sem mexer na altura dos campos.
 *
 * Acima de 30rem de altura entra o letreiro do bar (a placa vermelha). Ele é a
 * identidade do *lugar*; "Pedidos" é o nome do *caderno*. Por isso a hierarquia
 * se inverte em relação ao resto do app: a placa é o headline e o nome do app
 * aparece como legenda — no celular em pé numa linha só ("Pedidos · Caderno da
 * equipe"), porque 20px de altura fazem falta em 320×568; de 640px para cima
 * empilhado, onde sobra altura e a Bitter pode aparecer em 30/34px.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col justify-center bg-paper px-4 pt-[calc(0.75rem_+_env(safe-area-inset-top))] pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] sm:px-6 md:px-8 [@media(max-height:30rem)]:pt-[calc(0.5rem_+_env(safe-area-inset-top))] [@media(max-height:30rem)]:pb-[calc(0.5rem_+_env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-sm sm:max-w-3xl lg:max-w-5xl">
        <div className="sm:grid sm:grid-cols-[auto_auto] sm:items-start sm:justify-center sm:gap-8 md:gap-12 lg:gap-16">
          {/* Marca: linha no celular em pé; coluna à esquerda de 640px para cima. */}
          <div className="mb-4 [@media(max-height:30rem)]:mb-1.5 [@media(max-height:22rem)]:mb-0! sm:mb-0">
            {/*
             * A placa só existe acima de 30rem de altura — abaixo disso são 90px
             * de altura que o formulário não tem. No celular em pé ela ocupa a
             * largura da coluna (288px em 320 de viewport = 90px de altura) e
             * para aí: crescer junto com o aparelho faria a marca competir com o
             * formulário. De 640px para cima ela é limitada pelo espaço que sobra
             * ao lado do card — 176px em 640, 224px em 768 (224 + 48 de gap +
             * 420 do card = 692 dentro dos 704 úteis), 352px no desktop.
             */}
            <BrandSign className="mb-2 hidden w-full [@media(min-height:30.01rem)]:block sm:mb-3 sm:w-[11rem] md:w-[14rem] lg:w-[22rem]" />

            {/*
             * Legenda da placa: só no celular em pé com placa. É a única linha
             * de "Pedidos · Caderno da equipe" nesse tier, e existe para que a
             * tela não diga apenas "Bar do Santos" — o app é o caderno, a placa
             * é o bar.
             */}
            <p className="hidden text-[13px] leading-tight text-ink-soft [@media(min-height:30.01rem)_and_(max-width:39.99rem)]:block">
              <span className="font-display text-[15px] leading-none font-medium text-ink">
                Pedidos
              </span>
              <span aria-hidden="true"> · </span>
              Caderno da equipe
            </p>

            {/*
             * Bloco do nome do app: sozinho quando não há placa (todas as
             * alturas curtas, onde o caderninho aparece) e, de 640px para cima,
             * embaixo da placa sem o caderninho — ali a placa já é a imagem.
             */}
            <div className="hidden items-center gap-3 sm:flex [@media(max-height:30rem)]:flex">
              <BrandMark className="hidden h-12 w-12 shrink-0 rounded-xl [@media(max-height:30rem)]:block [@media(max-height:30rem)]:h-9 [@media(max-height:30rem)]:w-9 [@media(max-height:30rem)]:rounded-lg [@media(max-height:22rem)]:h-7! [@media(max-height:22rem)]:w-7! md:h-14 md:w-14 lg:h-16 lg:w-16" />
              <div className="min-w-0">
                <p className="font-display text-[24px] leading-none text-ink [@media(max-height:22rem)]:text-[18px] md:text-[30px] lg:text-[34px]">
                  Pedidos
                </p>
                <p className="mt-1.5 text-[13px] leading-none text-ink-soft [@media(max-height:30rem)]:mt-1 [@media(max-height:22rem)]:hidden md:mt-2.5 md:text-[15px]">
                  Caderno da equipe
                </p>
              </div>
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
