"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { IconAlert, IconSpinner } from "@/components/ui/icons";
import { errorBoxClass, inputClass, labelClass } from "@/components/ui/styles";
import { createOrder } from "@/lib/actions/orders";

const DRAFT_KEY = "pedidos:nova-nota";

interface Draft {
  name?: string;
  description?: string;
  valueCents?: number;
  valueOpen?: boolean;
}

export function NewNoteForm({ initialError }: { initialError: string | null }) {
  const router = useRouter();
  const errorId = useId();

  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);
  const openedValueRef = useRef(false);

  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [valueOpen, setValueOpen] = useState(false);
  const [valueCents, setValueCents] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  // Recupera o rascunho quando o salvamento falhou depois de sair da tela.
  useEffect(() => {
    if (!initialError) return;

    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      sessionStorage.removeItem(DRAFT_KEY);

      const draft = JSON.parse(raw) as Draft;
      if (typeof draft.name === "string") setCustomerName(draft.name);
      if (typeof draft.description === "string") setDescription(draft.description);
      if (typeof draft.valueCents === "number") setValueCents(draft.valueCents);
      if (draft.valueOpen === true) setValueOpen(true);
    } catch {
      // Rascunho indisponível: segue com o formulário limpo.
    }
  }, [initialError]);

  // Ao revelar o campo de valor, leva o foco para ele.
  useEffect(() => {
    if (valueOpen && openedValueRef.current) {
      openedValueRef.current = false;
      valueRef.current?.focus();
    }
  }, [valueOpen]);

  // Textarea cresce com o conteúdo, sem barra de rolagem interna.
  useEffect(() => {
    const element = descriptionRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [description, valueOpen]);

  function focusDescription(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    descriptionRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const name = customerName.trim();
    const order = description.trim();

    if (!name) {
      setError("Informe o nome do cliente.");
      nameRef.current?.focus();
      return;
    }
    if (!order) {
      setError("Escreva o pedido.");
      descriptionRef.current?.focus();
      return;
    }

    const totalCents = valueOpen ? valueCents : null;

    setError(null);
    setPending(true);

    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ name, description: order, valueCents, valueOpen }),
      );
    } catch {
      // Sem armazenamento local: segue sem rascunho.
    }

    // Otimista: volta para o caderno na hora; a gravação segue em paralelo.
    const saving = createOrder({
      customerName: name,
      description: order,
      totalCents,
    });
    router.push("/");

    try {
      const result = await saving;
      if (result.ok) {
        try {
          sessionStorage.removeItem(DRAFT_KEY);
        } catch {
          // Sem armazenamento local: nada a limpar.
        }
        router.refresh();
        return;
      }

      setPending(false);
      router.replace(
        `/nova?erro=${encodeURIComponent(
          result.error ?? "Não foi possível salvar a nota.",
        )}`,
      );
    } catch {
      setPending(false);
      router.replace(
        `/nova?erro=${encodeURIComponent(
          "Não foi possível salvar. Verifique a conexão.",
        )}`,
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-4 [@media(max-height:30rem)]:mt-2 md:max-w-lg"
    >
      {error ? (
        <div
          id={errorId}
          role="alert"
          aria-live="assertive"
          className={`${errorBoxClass} mb-4`}
        >
          <IconAlert size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/*
       * Tablet/celular deitado (largura >= 40rem e altura <= 30rem): os dois
       * campos ficam lado a lado para o botão Salvar caber sem rolagem. As
       * variantes `[@media(...)]` são literais de propósito — o scanner do
       * Tailwind só encontra classes escritas por extenso.
       */}
      <div className="[@media(min-width:40rem)_and_(max-height:30rem)]:flex [@media(min-width:40rem)_and_(max-height:30rem)]:items-start [@media(min-width:40rem)_and_(max-height:30rem)]:gap-4">
        <div className="min-w-0 [@media(min-width:40rem)_and_(max-height:30rem)]:flex-1">
          <div>
            <label htmlFor="cliente" className={labelClass}>
              Nome do cliente
            </label>
            <input
              id="cliente"
              ref={nameRef}
              name="customerName"
              type="text"
              autoFocus
              required
              maxLength={80}
              enterKeyHint="next"
              autoComplete="off"
              autoCapitalize="words"
              value={customerName}
              disabled={pending}
              onChange={(event) => setCustomerName(event.target.value)}
              onKeyDown={focusDescription}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              placeholder="Ex.: Dona Lúcia"
              className={`${inputClass} mt-1.5`}
            />
          </div>

          <div className="mt-3 [@media(max-height:30rem)]:mt-2">
            {valueOpen ? (
              <>
                <label htmlFor="valor" className={labelClass}>
                  Valor (opcional)
                </label>
                <CurrencyInput
                  id="valor"
                  inputRef={valueRef}
                  value={valueCents}
                  onValueChange={setValueCents}
                  disabled={pending}
                />
                <button
                  type="button"
                  onClick={() => {
                    setValueCents(null);
                    setValueOpen(false);
                  }}
                  className="mt-0.5 inline-flex min-h-11 items-center text-[13px] text-ink-soft underline underline-offset-2 transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Remover valor
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  openedValueRef.current = true;
                  setValueOpen(true);
                }}
                aria-controls="valor"
                aria-expanded={false}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-[14px] font-medium text-brand-ink transition-colors duration-150 hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span aria-hidden className="text-[17px] leading-none">
                  +
                </span>
                valor
                <span className="font-normal text-ink-soft">(opcional)</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 min-w-0 [@media(min-width:40rem)_and_(max-height:30rem)]:mt-0 [@media(min-width:40rem)_and_(max-height:30rem)]:flex-1">
          <label htmlFor="pedido" className={labelClass}>
            Pedido
          </label>
          <textarea
            id="pedido"
            ref={descriptionRef}
            name="description"
            rows={2}
            required
            maxLength={2000}
            enterKeyHint="done"
            value={description}
            disabled={pending}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            placeholder={"Ex.: 1 marmita de frango\nsem salada · suco de laranja"}
            className={`${inputClass} mt-1.5 min-h-[84px] resize-none overflow-hidden leading-relaxed [@media(min-width:40rem)_and_(max-height:30rem)]:min-h-[76px]`}
          />
        </div>
      </div>

      {/*
       * Rodapé: só o botão Salvar, no fluxo, logo depois dos campos.
       *
       * O valor opcional vive no bloco de campos (acima do pedido) — antes ele
       * era renderizado duas vezes, uma no campo e outra aqui, o que empilhava
       * dois "+ valor" idênticos no celular e empurrava a página 48px além da
       * dobra em 320x568.
       *
       * Sem barra fixa: a barra antiga cobria metade do formulário em 844x390 e
       * somava padding extra que estourava a dobra. Em altura curta o `mt` cai
       * para 8px, o que mantém o botão visível em 667x375 sem encostar na
       * navegação flutuante.
       */}
      <div className="mt-4 [@media(max-height:30rem)]:mt-2">
        <Button type="submit" size="lg" fullWidth disabled={pending}>
          {pending ? (
            <>
              <IconSpinner size={20} />
              Salvando…
            </>
          ) : (
            "Salvar nota"
          )}
        </Button>
      </div>
    </form>
  );
}
