"use client";

import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Provider de tema (next-themes) montado no RootLayout.
 *
 * - `attribute="class"`: alterna `.dark` no `<html>`, que é o que o
 *   `@custom-variant dark` do globals.css e os blocos `:root`/`.dark` esperam.
 * - `defaultTheme="system"` + `enableSystem`: respeita o SO na primeira visita;
 *   a escolha manual fica persistida no localStorage (`theme`).
 * - `disableTransitionOnChange`: impede transições CSS atravessando a troca de
 *   tema (evita o "flash" de componentes animando enquanto a paleta muda).
 *
 * Qualquer componente que use os tokens semânticos (`bg-surface`, `text-ink`,
 * `border-line-strong`…) funciona nos dois modos sem tocar neste provider.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
