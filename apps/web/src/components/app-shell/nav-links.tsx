"use client";

import { usePathname } from "next/navigation";

import { IconCash, IconNote, IconUsers } from "@/components/ui/icons";
import type { MemberRole } from "@/lib/types";

/** Ícone aceita `size`/`className`; restringe o tipo ao que a nav consome. */
type NavIcon = typeof IconNote;

export interface NavItem {
  href: string;
  label: string;
  Icon: NavIcon;
  active: boolean;
}

/**
 * Fonte única dos itens de navegação. As duas apresentações (barra inferior no
 * celular, tabs no header do desktop) leem daqui para nunca divergirem em
 * ordem, ícone ou estado ativo.
 */
export function useNavItems(role: MemberRole): NavItem[] {
  const pathname = usePathname();

  const items: NavItem[] = [
    {
      href: "/",
      label: "Pedidos",
      Icon: IconNote,
      active:
        pathname === "/" || pathname.startsWith("/nota") || pathname === "/nova",
    },
    {
      href: "/caixa",
      label: "Caixa",
      Icon: IconCash,
      active: pathname.startsWith("/caixa"),
    },
  ];

  if (role === "owner") {
    items.push({
      href: "/equipe",
      label: "Equipe",
      Icon: IconUsers,
      active: pathname.startsWith("/equipe"),
    });
  }

  return items;
}
