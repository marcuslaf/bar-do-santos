"use client";

import Link from "next/link";

import { useNavItems } from "@/components/app-shell/nav-links";
import type { MemberRole } from "@/lib/types";

/**
 * Navegação do desktop/tablet: segmented control dentro do header, alinhado ao
 * container do conteúdo. Substitui a antiga barra inferior fixa, que em 1280px
 * distribuía 3 itens por 1280px de largura e deixava o app com cara de celular
 * esticado.
 *
 * Alvo de 44px (`min-h-11`) para continuar correto em tablet com toque.
 */
export function HeaderNav({ role }: { role: MemberRole }) {
  const items = useNavItems(role);

  return (
    <nav
      aria-label="Navegação principal"
      className="hidden shrink-0 items-center gap-0.5 rounded-xl border border-line bg-surface-2 p-0.5 md:flex"
    >
      {items.map(({ href, label, Icon, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={[
            "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-[14px] font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            active
              ? "bg-surface text-brand-ink shadow-card"
              : "text-ink-soft hover:text-ink",
          ].join(" ")}
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
