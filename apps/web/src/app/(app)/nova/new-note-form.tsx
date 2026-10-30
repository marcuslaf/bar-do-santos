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
import {
  IconAlert,
  IconPlus,
  IconSpinner,
  IconX,
} from "@/components/ui/icons";
import { errorBoxClass, inputClass, labelClass } from "@/components/ui/styles";
import { createOrder } from "@/lib/actions/orders";
import { formatCents } from "@/lib/format";
import type { BaiãoOption, OrderItemInput } from "@/lib/types";

const DRAFT_KEY = "pedidos:nova-nota";

/** "nao" é o estado de interface; no payload vira `null` (não informado). */
type BaiaoChoice = BaiãoOption | "nao";

interface DraftItem extends OrderItemInput {
  key: string;
}

interface Draft {
  name?: string;
  description?: string;
  valueCents?: number;
  valueOpen?: boolean;
  items?: OrderItemInput[];
}

export interface DishTagOption {
  id: string;
  name: string;
}

const BAIAO_OPTIONS: { value: BaiaoChoice; label: string }[] = [
  { value: "com", label: "Com baião" },
  { value: "sem", label: "Sem baião" },
  { value: "nao", label: "Não informado" },
];

function itemMeta(item: DraftItem, dishTags: DishTagOption[]): string {
  const dish = dishTags.find((tag) => tag.id === item.dishTagId)?.name;
  const baiao =
    item.baiãoOption === "com"
      ? "com baião"
      : item.baiãoOption === "sem"
        ? "sem baião"
        : null;

  return [dish, baiao].filter(Boolean).join(" · ") || "Sem prato definido";
}

export function NewNoteForm({
  initialError,
  dishTags,
}: {
  initialError: string | null;
  dishTags: DishTagOption[];
}) {
  const router = useRouter();
  const errorId = useId();
  const itemPanelId = useId();

  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);
  const itemNameRef = useRef<HTMLInputElement>(null);
  const itemValueRef = useRef<HTMLInputElement>(null);
  const openedValueRef = useRef(false);

  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [valueOpen, setValueOpen] = useState(false);
  const [valueCents, setValueCents] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  // Itens da nota
  const [items, setItems] = useState<DraftItem[]>([]);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemDishTagId, setItemDishTagId] = useState("");
  const [itemBaiao, setItemBaiao] = useState<BaiaoChoice>("nao");
  const [itemValueCents, setItemValueCents] = useState<number | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);

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

      if (Array.isArray(draft.items)) {
        const restored = draft.items
          .filter(
            (item): item is OrderItemInput =>
              typeof item?.itemName === "string" &&
              typeof item?.unitPriceCents === "number",
          )
          .map((item, index) => ({
            ...item,
            key: `rascunho-${index}`,
          }));
        if (restored.length > 0) setItems(restored);
      }
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

  // Ao abrir a seção de itens, leva o foco para o primeiro campo.
  useEffect(() => {
    if (itemsOpen) itemNameRef.current?.focus();
  }, [itemsOpen]);

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

  function resetItemForm() {
    setItemName("");
    setItemDishTagId("");
    setItemBaiao("nao");
    setItemValueCents(null);
    setItemError(null);
  }

  function handleAddItem() {
    const name = itemName.trim();

    if (!name) {
      setItemError("Informe o nome do item.");
      itemNameRef.current?.focus();
      return;
    }
    if (itemValueCents === null) {
      setItemError("Informe o valor do item.");
      return;
    }

    setItems((current) => [
      ...current,
      {
        key: `item-${current.length}-${name}`,
        itemName: name,
        dishTagId: itemDishTagId || null,
        baiãoOption: itemBaiao === "nao" ? null : itemBaiao,
        unitPriceCents: itemValueCents,
      },
    ]);
    resetItemForm();
    itemNameRef.current?.focus();
  }

  function handleRemoveItem(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
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

    // Item digitado mas não adicionado à lista: inclui se estiver completo.
    let submittedItems = items;
    const hasPendingItem =
      itemName.trim().length > 0 || itemValueCents !== null;

    if (hasPendingItem) {
      if (!itemName.trim() || itemValueCents === null) {
        setError("Complete o item em aberto ou feche a seção de itens.");
        itemNameRef.current?.focus();
        return;
      }

      submittedItems = [
        ...items,
        {
          key: "item-em-aberto",
          itemName: itemName.trim(),
          dishTagId: itemDishTagId || null,
          baiãoOption: itemBaiao === "nao" ? null : itemBaiao,
          unitPriceCents: itemValueCents,
        },
      ];
    }

    const totalCents = valueOpen ? valueCents : null;
    const payloadItems: OrderItemInput[] = submittedItems.map((item) => ({
      itemName: item.itemName,
      dishTagId: item.dishTagId,
      baiãoOption: item.baiãoOption,
      unitPriceCents: item.unitPriceCents,
    }));

    setError(null);
    setPending(true);

    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          name,
          description: order,
          valueCents,
          valueOpen,
          items: payloadItems,
        }),
      );
    } catch {
      // Sem armazenamento local: segue sem rascunho.
    }

    // Otimista: volta para o caderno na hora; a gravação segue em paralelo.
    const saving = createOrder({
      customerName: name,
      description: order,
      totalCents,
      items: payloadItems.length > 0 ? payloadItems : undefined,
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

  const itemsTotalCents = items.reduce(
    (sum, item) => sum + item.unitPriceCents,
    0,
  );

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

          <div
            className={
              items.length > 0
                ? "hidden"
                : "mt-3 [@media(max-height:30rem)]:mt-2"
            }
          >
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
       * Itens da nota: a seção nasce fechada para o botão Salvar continuar na
       * dobra em 320x568 e em altura curta. Ao abrir, os campos do item são
       * explícitos e a lista de itens já adicionados fica sempre visível.
       */}
      <section aria-label="Itens da nota" className="mt-4 [@media(max-height:30rem)]:mt-2">
        <div className="flex items-center justify-between gap-3 [@media(max-height:30rem)]:hidden">
          <h2 className="text-[13px] font-semibold tracking-[0.08em] text-ink-soft uppercase">
            Itens
            <span className="ml-1 font-normal normal-case tracking-normal">
              (opcional)
            </span>
          </h2>

          <Button
            size="compact"
            variant={itemsOpen ? "ghost" : "secondary"}
            onClick={() => {
              setItemError(null);
              setItemsOpen(!itemsOpen);
            }}
            aria-expanded={itemsOpen}
            aria-controls={itemsOpen ? itemPanelId : undefined}
            disabled={pending}
          >
            {itemsOpen ? (
              "Fechar"
            ) : (
              <>
                <IconPlus size={16} />
                Item
              </>
            )}
          </Button>
        </div>

        {items.length > 0 ? (
          <>
            <ul className="mt-2 space-y-2">
              {items.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-ink">
                      {item.itemName}
                    </p>
                    <p className="truncate text-[12px] text-ink-soft">
                      {itemMeta(item, dishTags)}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-[15px] text-ink">
                    {formatCents(item.unitPriceCents)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.key)}
                    aria-label={`Remover item ${item.itemName}`}
                    disabled={pending}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-danger transition-colors duration-150 hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
                  >
                    <IconX size={18} />
                  </button>
                </li>
              ))}
            </ul>

            <p className="tabular mt-2 text-right text-[13px] text-ink-soft">
              Itens somam {formatCents(itemsTotalCents)}
            </p>
          </>
        ) : null}

        {itemsOpen ? (
          <div
            id={itemPanelId}
            onKeyDown={(event) => {
              // Enter dentro dos campos do item adiciona o item; sem isso o
              // formulário inteiro seria enviado no meio da montagem da nota.
              if (event.key !== "Enter") return;
              if ((event.target as HTMLElement).tagName === "BUTTON") return;

              event.preventDefault();
              if (event.target === itemNameRef.current) {
                itemValueRef.current?.focus();
                return;
              }
              handleAddItem();
            }}
            className="mt-3 rounded-xl border border-line bg-surface p-3"
          >
            {itemError ? (
              <div role="alert" aria-live="assertive" className={`${errorBoxClass} mb-3`}>
                <IconAlert size={18} className="mt-0.5 shrink-0" />
                <span>{itemError}</span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 [@media(min-width:30rem)]:grid-cols-2">
              <div className="[@media(min-width:30rem)]:col-span-2">
                <label htmlFor="item-nome" className={labelClass}>
                  Nome do item
                </label>
                <input
                  id="item-nome"
                  ref={itemNameRef}
                  type="text"
                  maxLength={80}
                  enterKeyHint="next"
                  autoComplete="off"
                  autoCapitalize="words"
                  value={itemName}
                  disabled={pending}
                  onChange={(event) => {
                    setItemError(null);
                    setItemName(event.target.value);
                  }}
                  placeholder="Ex.: Forte Couro"
                  className={`${inputClass} mt-1.5`}
                />
              </div>

              <div>
                <label htmlFor="item-prato" className={labelClass}>
                  Prato
                </label>
                <select
                  id="item-prato"
                  value={itemDishTagId}
                  disabled={pending || dishTags.length === 0}
                  onChange={(event) => setItemDishTagId(event.target.value)}
                  className={`${inputClass} mt-1.5`}
                >
                  <option value="">Sem prato</option>
                  {dishTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                {dishTags.length === 0 ? (
                  <p className="mt-1 text-[12px] text-ink-soft">
                    Nenhum prato cadastrado ainda.
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="item-valor" className={labelClass}>
                  Valor do item
                </label>
                <CurrencyInput
                  id="item-valor"
                  inputRef={itemValueRef}
                  value={itemValueCents}
                  onValueChange={(cents) => {
                    setItemError(null);
                    setItemValueCents(cents);
                  }}
                  disabled={pending}
                />
              </div>

              <fieldset className="[@media(min-width:30rem)]:col-span-2">
                <legend className={labelClass}>Baião</legend>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {BAIAO_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="relative flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface px-2 text-center text-[13px] font-medium text-ink transition-colors duration-150 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand"
                    >
                      <input
                        type="radio"
                        name="item-baiao"
                        value={option.value}
                        checked={itemBaiao === option.value}
                        disabled={pending}
                        onChange={() => setItemBaiao(option.value)}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <Button
              variant="secondary"
              className="mt-3"
              fullWidth
              onClick={handleAddItem}
              disabled={pending}
            >
              <IconPlus size={18} />
              Adicionar item
            </Button>
          </div>
        ) : null}
      </section>

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
      <div className="mt-4 [@media(max-height:30rem)]:mt-2 [@media(max-height:30rem)]:flex [@media(max-height:30rem)]:items-center [@media(max-height:30rem)]:gap-2">
        {/*
         * Em altura curta o cabeçalho da seção de itens sai de cena e o botão
         * "Item" desce para o rodapé, ao lado de Salvar: a ação primária
         * continua na dobra em 667x375 sem somar 52px de header.
         */}
        <Button
          size="lg"
          variant="secondary"
          onClick={() => {
            setItemError(null);
            setItemsOpen(!itemsOpen);
          }}
          aria-expanded={itemsOpen}
          aria-controls={itemsOpen ? itemPanelId : undefined}
          disabled={pending}
          className="hidden shrink-0 [@media(max-height:30rem)]:inline-flex"
        >
          {itemsOpen ? (
            "Fechar"
          ) : (
            <>
              <IconPlus size={18} />
              Item
            </>
          )}
        </Button>

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
