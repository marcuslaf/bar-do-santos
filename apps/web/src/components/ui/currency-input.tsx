"use client";

import {
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";

import { inputClass } from "@/components/ui/styles";
import {
  centsFromDigits,
  centsFromPastedText,
  formatAmount,
  MAX_AMOUNT_CENTS,
} from "@/lib/format";

interface CurrencyInputProps {
  id: string;
  value: number | null;
  onValueChange: (cents: number | null) => void;
  disabled?: boolean;
  describedBy?: string;
  /** Marca o campo para o Modal focar ao abrir (seletor [data-autofocus]). */
  autoFocusOnOpen?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}

/**
 * Campo de dinheiro com máscara de PDV: só dígitos, preenchendo da direita para
 * a esquerda ("3" → 0,03 · "3250" → 32,50). Evita o erro de 100× de digitar
 * 3250 num teclado sem vírgula querendo dizer R$ 32,50.
 *
 * Colar "32,50" / "32.50" respeita os centavos (`centsFromPastedText`).
 */
export function CurrencyInput({
  id,
  value,
  onValueChange,
  disabled,
  describedBy,
  autoFocusOnOpen,
  inputRef,
}: CurrencyInputProps) {
  function commit(next: number | null) {
    // Acima do limite do banco: ignora a tecla em vez de falhar no salvamento.
    if (next !== null && next > MAX_AMOUNT_CENTS) return;
    onValueChange(next);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    commit(centsFromDigits(event.target.value));
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    commit(centsFromPastedText(event.clipboardData.getData("text")));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Em 0,00 não sobrou dígito para apagar: o backspace limpa o campo.
    if (event.key === "Backspace" && value === 0) {
      event.preventDefault();
      onValueChange(null);
    }
  }

  return (
    <div className="relative mt-1.5">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-ink-soft"
      >
        R$
      </span>
      <input
        id={id}
        ref={inputRef}
        data-autofocus={autoFocusOnOpen ? "" : undefined}
        type="text"
        inputMode="numeric"
        enterKeyHint="done"
        autoComplete="off"
        value={formatAmount(value)}
        disabled={disabled}
        // Seleciona o valor ao focar: digitar substitui em vez de acrescentar
        // dígitos ao valor que já veio preenchido (pagamento/edição).
        onFocus={(event) => event.currentTarget.select()}
        onChange={handleChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder="0,00"
        aria-describedby={describedBy}
        className={`${inputClass} tabular pl-11`}
      />
    </div>
  );
}
