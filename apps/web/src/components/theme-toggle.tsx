"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { IconMoon, IconSun } from "@/components/ui/icons";

// `useSyncExternalStore` com snapshot fixo: false no servidor/hidratação, true
// depois do mount. É a forma canônica de esperar o mount sem efeito + setState
// (que o lint do React Compiler reprova por causar render em cascata).
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Alterna claro ↔ escuro.
 *
 * Dois estados só: a primeira visita segue o sistema (`defaultTheme="system"`
 * no provider), mas a partir do primeiro toque a escolha é explícita e fica
 * salva. Não existe estado "sistema" na interface — para um app de balcão,
 * dois estados resolvem e o botão nunca fica em dúvida sobre o que vai fazer.
 *
 * Os dois ícones existem sempre no DOM e a troca é CSS pura (`dark:hidden` /
 * `hidden dark:block`), então não há flash de ícone nem mismatch de hidratação.
 * O `aria-label` depende do tema resolvido; antes do mount ele descreve a ação
 * de forma genérica.
 *
 * Alvo de toque de 44px (`h-11 w-11`) e foco visível nos dois temas — num
 * tablet de cozinha o toque precisa funcionar de primeira.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        mounted
          ? isDark
            ? "Mudar para tema claro"
            : "Mudar para tema escuro"
          : "Alternar tema claro e escuro"
      }
      title={isDark ? "Tema escuro — mudar para claro" : "Tema claro — mudar para escuro"}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink transition-colors duration-150 ease-out hover:bg-surface-2 active:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <IconSun size={20} className="dark:hidden" />
      <IconMoon size={20} className="hidden dark:block" />
    </button>
  );
}
