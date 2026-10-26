"use client";

import Link from "next/link";

import { useNavItems } from "@/components/app-shell/nav-links";
import type { MemberRole } from "@/lib/types";

/**
 * Navegação do celular: barra flutuante ancorada na base, com largura limitada
 * (`max-w-md`) para não virar um rodapé esticado de ponta a ponta em telas
 * largas. Some a partir de `md`, onde `HeaderNav` assume como segmented control.
 *
 * `pb` usa `env(safe-area-inset-bottom)` e o `<main>` reserva o mesmo espaço,
 * então nada fica por baixo da barra no iPhone com home indicator.
 */
export function BottomNav({ role }: { role: MemberRole }) {
  const items = useNavItems(role);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(0.375rem_+_env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="mx-auto flex w-full max-w-md items-stretch gap-1 rounded-2xl border border-line bg-surface/95 p-1 shadow-float backdrop-blur-md">
        {items.map(({ href, label, Icon, active }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-semibold tracking-[0.06em] uppercase transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand [@media(max-height:30rem)]:min-h-12",
              active
                ? "bg-brand-soft text-brand-ink"
                : "text-ink-soft hover:bg-surface-2 hover:text-ink",
            ].join(" ")}
          >
            <Icon size={22} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
