"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconChevronRight } from "@/components/ui/icons";

/**
 * Bloco de identidade do header (nome do bar + "Nome · Papel") como entrada da
 * conta → `/minha-senha`.
 *
 * Por que o bloco inteiro é o link, e não só a segunda linha: o header em 320px
 * comporta exatamente dois controles à direita (tema e "Sair") — um terceiro
 * estoura a largura e empurra o "Sair" para dentro de menu, tirando-o do toque
 * único que o balcão usa todo dia. Um link de 12px de altura dentro do texto
 * resolveria a largura, mas ficaria abaixo do alvo de 44px. O bloco de
 * identidade, por outro lado, já tem 36px de conteúdo e cabe em 44px dentro dos
 * 56px do header: é o único alvo existente que dá para transformar em controle
 * sem mexer no layout.
 *
 * A seta (sempre visível, fora do `truncate`) é a affordance: num aparelho de
 * bar não existe hover, e texto truncado sozinho não anuncia "sou tocável".
 * `aria-current` marca a própria tela.
 */
export function AccountLink({
  orgName,
  subtitle,
}: {
  orgName: string;
  subtitle: string;
}) {
  const pathname = usePathname();
  const active = pathname === "/minha-senha";

  return (
    <Link
      href="/minha-senha"
      aria-current={active ? "page" : undefined}
      /*
       * Nome acessível explícito: junta o texto visível (nome do bar + quem
       * está logado) e o destino. Sem ele, o leitor de tela anuncia só o nome
       * do bar e a pessoa não tem como saber que aquilo leva à conta.
       */
      aria-label={`${orgName}: ${subtitle}. Trocar minha senha`}
      className={[
        "-ml-1.5 inline-flex min-h-11 max-w-full min-w-0 items-center gap-1.5 rounded-xl pr-1.5 pl-1.5",
        "transition-colors duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        // Na própria tela o chip fica marcado; fora dela, o hover é a pista de
        // que aquilo é tocável no desktop. Sem `hover:` duplicado: duas
        // variantes do mesmo utilitário brigariam pela ordem do CSS.
        active ? "bg-surface-2 hover:bg-surface-3" : "hover:bg-surface-2 active:bg-surface-3",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="flex min-w-0 flex-col justify-center">
        <span className="truncate font-display text-[17px] leading-tight text-ink">
          {orgName}
        </span>
        <span className="truncate text-[12px] leading-tight text-ink-soft">
          {subtitle}
        </span>
      </span>
      <IconChevronRight
        size={15}
        className="shrink-0 text-ink-soft transition-colors duration-150"
      />
    </Link>
  );
}
