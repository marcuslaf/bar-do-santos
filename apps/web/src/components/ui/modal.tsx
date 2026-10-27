"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { IconX } from "@/components/ui/icons";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Diálogo acessível: role=dialog + aria-modal, Esc fecha, foco preso no painel,
 * clique no fundo fecha, rolagem do body bloqueada e foco restaurado ao fechar.
 * No celular vira uma folha ancorada na base (polegar).
 *
 * O painel é uma coluna com duas regiões: o corpo rola e o rodapé fica parado.
 * Antes o painel inteiro rolava, então em tela curta (568×320, celular deitado)
 * o botão de confirmar nascia fora do viewport — quem abre um diálogo não deve
 * ter que descobrir que existe rolagem para conseguir confirmar.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;

    function focusableItems(): HTMLElement[] {
      if (!panel) return [];
      return Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null);
    }

    const initial =
      panel?.querySelector<HTMLElement>("[data-autofocus]") ??
      focusableItems()[0];
    initial?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const items = focusableItems();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;

      const active = document.activeElement;
      const inside = panel?.contains(active) ?? false;

      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        aria-hidden="true"
        onClick={() => onCloseRef.current()}
        className="animate-overlay-in absolute inset-0 bg-scrim"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="animate-sheet-in relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-float sm:max-w-md sm:rounded-2xl"
      >
        {/*
         * Fica fora do corpo rolável de propósito: com o corpo rolando, um
         * "Fechar" dentro dele sairia pela borda de cima no primeiro gesto.
         * `bg-surface` porque agora há conteúdo passando por trás do ícone.
         */}
        <button
          type="button"
          onClick={() => onCloseRef.current()}
          aria-label="Fechar"
          className="absolute top-2.5 right-2.5 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink-soft transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <IconX size={20} />
        </button>

        {/*
         * Única região rolável. `min-h-0` libera o flex a encolher abaixo do
         * conteúdo (é o que faz o rodapé caber), e `flex-1` mantém o painel
         * colado no conteúdo quando ele é curto. Quando não há rodapé, o
         * padding inferior com safe-area fica aqui — senão o painel terminaria
         * sem respiro na base do aparelho.
         */}
        <div
          className={[
            "min-h-0 flex-1 overflow-y-auto p-5",
            footer
              ? null
              : "pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] sm:pb-5",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <h2
            id={titleId}
            className="pr-12 font-display text-[21px] leading-tight text-ink"
          >
            {title}
          </h2>
          {description ? (
            <p
              id={descriptionId}
              className="mt-1.5 pr-8 text-[14px] text-ink-soft"
            >
              {description}
            </p>
          ) : null}

          <div className="mt-4">{children}</div>
        </div>

        {/*
         * `border-t` só aqui: com o corpo cortando o conteúdo na borda inferior,
         * a linha é o que explica que aquele texto continua acima em vez de
         * parecer truncado. Sem ela, conteúdo rolado encosta nos botões.
         */}
        {footer ? (
          <div className="flex shrink-0 gap-2 border-t border-line px-5 pt-4 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] sm:pb-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
