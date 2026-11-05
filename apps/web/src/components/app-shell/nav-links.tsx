"use client";

import { usePathname } from "next/navigation";

import { IconCash, IconNote, IconSearch, IconUsers } from "@/components/ui/icons";
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
    {
      href: "/filtros",
      label: "Filtros",
      Icon: IconSearch,
      active: pathname.startsWith("/filtros"),
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

  // "Pratos" (/tags) não é destino de primeiro nível: entra pelo bloco
  // "Catálogo" em /filtros (só owner). Com 5 destinos a barra móvel
  // sobrepunha as etiquetas em 320px.
  return items;
}
