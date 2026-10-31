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
import { IconAlert, IconPlus, IconSpinner, IconX, IconCheck } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { errorBoxClass, inputClass, labelClass } from "@/components/ui/styles";
import { createOrder } from "@/lib/actions/orders";
import { formatCents } from "@/lib/format";
import type { BaiãoOption, OrderItemInput } from "@/lib/types";

const DRAFT_KEY = "pedidos:nova-nota";

/**
 * `orders.description` é NOT NULL e não aceita string vazia no banco, mas as
 * observações são opcionais na captura: o campo vazio grava este texto neutro
 * no lugar (a nota nunca fica sem descrição).
 */
type BaiaoChoice = BaiãoOption | "nao";

interface DraftItem extends OrderItemInput {
  key: string;
  funcionario?: string; // nome do funcionário que fez o pedido
}

interface Draft {
  name?: string;
  observations?: string;
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

  const funcionario = item.funcionario ? ` · ${item.funcionario}` : "";
  return [dish, baiao].filter(Boolean).join(" · ") + funcionario || "Sem prato definido";
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
  const baiaoGroupName = useId();

  const nameRef = useRef<HTMLInputElement>(null);
  const observationsRef = useRef<HTMLTextAreaElement>(null);
  const itemNameRef = useRef<HTMLInputElement>(null);
  const itemValueRef = useRef<HTMLInputElement>(null);
  const itemKeyRef = useRef(0);

  const [customerName, setCustomerName] = useState("");
  const [observations, setObservations] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  // Itens da nota (parte do cabeçalho, sempre visíveis)
  const [items, setItems] = useState<DraftItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemFuncionario, setItemFuncionario] = useState("");
  const [itemDishTagId, setItemDishTagId] = useState("");
  const [itemBaiao, setItemBaiao] = useState<BaiaoChoice>("nao");
  const [itemValueCents, setItemValueCents] = useState<number | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemNameOpen, setItemNameOpen] = useState(false);

  // Modal para adicionar funcionário/item
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [modalFuncionario, setModalFuncionario] = useState("");
  const [modalItemName, setModalItemName] = useState("");
  const [modalItemDishTagId, setModalItemDishTagId] = useState("");
  const [modalItemBaiao, setModalItemBaiao] = useState<BaiaoChoice>("nao");
  const [modalItemValueCents, setModalItemValueCents] = useState<number | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalPending, setModalPending] = useState(false);

  // Recupera o rascunho quando o salvamento falhou depois de sair da tela.
  useEffect(() => {
    if (!initialError) return;

    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      sessionStorage.removeItem(DRAFT_KEY);

      const draft = JSON.parse(raw) as Draft;
      if (typeof draft.name === "string") setCustomerName(draft.name);
      if (typeof draft.observations === "string") {
        setObservations(draft.observations);
      }

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

  // Textarea cresce com o conteúdo, sem barra de rolagem interna.
  useEffect(() => {
    const element = observationsRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [observations]);

  function focusObservations(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    observationsRef.current?.focus();
  }

  function nextItemKey(): string {
    itemKeyRef.current += 1;
    return `item-${itemKeyRef.current}`;
  }

  /** Item montado a partir do formulário inline (só chamar após validar). */
  function itemFromForm(key: string): DraftItem {
    return {
      key,
      itemName: itemName.trim(),
      funcionario: itemName.trim(), // usa o nome do funcionário como nome do item
      dishTagId: itemDishTagId || null,
      baiãoOption: itemBaiao === "nao" ? null : itemBaiao,
      unitPriceCents: itemValueCents ?? 0,
    };
  }

  function getDishNameById(id: string): string | undefined {
    return dishTags.find((tag) => tag.id === id)?.name;
  }

  function resetItemForm() {
    setItemName("");
    setItemFuncionario("");
    setItemDishTagId("");
    setItemBaiao("nao");
    setItemValueCents(null);
    setItemError(null);
  }

  function resetModalForm() {
    setModalFuncionario("");
    setModalItemName("");
    setModalItemDishTagId("");
    setModalItemBaiao("nao");
    setModalItemValueCents(null);
    setModalError(null);
  }

  function handleAddItem() {
    let name = itemName.trim();

    // Se nome vazio mas prato selecionado, usa nome do prato
    if (!name && itemDishTagId) {
      const dishName = getDishNameById(itemDishTagId);
      if (dishName) {
        setItemName(dishName);
        name = dishName;
      }
    }

    if (!name) {
      setItemError("Informe o nome do item.");
      itemNameRef.current?.focus();
      return;
    }
    if (itemValueCents === null) {
      setItemError("Informe o valor do item.");
      itemValueRef.current?.focus();
      return;
    }

    setItems((current) => [...current, itemFromForm(nextItemKey())]);
    resetItemForm();
    setItemNameOpen(true);
    itemNameRef.current?.focus();
  }

  function handleRemoveItem(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  function openItemModal() {
    resetModalForm();
    setItemModalOpen(true);
  }

  function closeItemModal() {
    setItemModalOpen(false);
    resetModalForm();
  }

  async function handleAddItemModal() {
    let name = modalItemName.trim();

    // Se nome vazio mas prato selecionado, usa nome do prato
    if (!name && modalItemDishTagId) {
      const dishName = dishTags.find((t) => t.id === modalItemDishTagId)?.name;
      if (dishName) {
        setModalItemName(dishName);
        name = dishName;
      }
    }

    if (!name) {
      setModalError("Informe o nome do item.");
      return;
    }
    if (modalItemValueCents === null) {
      setModalError("Informe o valor do item.");
      return;
    }
    if (!modalFuncionario.trim()) {
      setModalError("Informe o nome do funcionário.");
      return;
    }

    setModalPending(true);

    try {
      const newItem: DraftItem = {
        key: nextItemKey(),
        itemName: name,
        funcionario: modalFuncionario.trim(),
        dishTagId: modalItemDishTagId || null,
        baiãoOption: modalItemBaiao === "nao" ? null : modalItemBaiao,
        unitPriceCents: modalItemValueCents ?? 0,
      };

      setItems((current) => [...current, newItem]);
      closeItemModal();
    } finally {
      setModalPending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const name = customerName.trim();

    if (!name) {
      setError("Informe o nome do cliente.");
      nameRef.current?.focus();
      return;
    }

    // Item digitado mas não adicionado à lista: inclui se estiver completo.
    // Considera item pendente se QUALQUER campo do item estiver preenchido
    // (nome, prato, valor ou baião), não apenas quando o campo nome está aberto.
    // Se nome vazio mas prato selecionado, usa nome do prato para validação e payload.
    const effectiveItemName = itemName.trim() || 
      (itemDishTagId ? dishTags.find((t) => t.id === itemDishTagId)?.name || "" : "");

    let submittedItems = items;
    const hasPendingItem =
      itemName.trim().length > 0 ||
      itemDishTagId !== "" ||
      itemValueCents !== null ||
      itemBaiao !== "nao";

    if (hasPendingItem) {
      if (!effectiveItemName || itemValueCents === null) {
        setError(
          "Complete o item em aberto (nome e valor) ou limpe esses campos.",
        );
        itemNameRef.current?.focus();
        return;
      }

      submittedItems = [...items, { ...itemFromForm("item-em-aberto"), itemName: effectiveItemName }];
    }

    const noteText = observations.trim();
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
          observations: observations.trim(),
          items: payloadItems,
        }),
      );
    } catch {
      // Sem armazenamento local: segue sem rascunho.
    }

    // Otimista: volta para o caderno na hora; a gravação segue em paralelo.
    // O total nunca vem digitado: com itens a action soma os valores deles;
    // sem itens a nota nasce sem valor.
    const saving = createOrder({
      customerName: name,
      description: noteText,
      totalCents: null,
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
       * Tablet/celular deitado (largura >= 40rem e altura <= 30rem): nome e
       * observações ficam lado a lado para economizar altura. As variantes
       * `[@media(...)]` são literais de propósito — o scanner do Tailwind só
       * encontra classes escritas por extenso.
       */}
      <div className="[@media(min-width:40rem)_and_(max-height:30rem)]:flex [@media(min-width:40rem)_and_(max-height:30rem)]:items-start [@media(min-width:40rem)_and_(max-height:30rem)]:gap-4">
        <div className="min-w-0 [@media(min-width:40rem)_and_(max-height:30rem)]:flex-1">
          <label htmlFor="cliente" className={labelClass}>
            Empresa / cliente
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
            onKeyDown={focusObservations}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            placeholder="Ex.: Forte Couro ou Dona Lúcia"
            className={`${inputClass} mt-1.5`}
          />
        </div>

        <div className="mt-3 min-w-0 [@media(min-width:40rem)_and_(max-height:30rem)]:mt-0 [@media(min-width:40rem)_and_(max-height:30rem)]:flex-1">
          <label htmlFor="observacoes" className={labelClass}>
            Observações{" "}
            <span className="font-normal normal-case tracking-normal">
              (opcional)
            </span>
          </label>
          <textarea
            id="observacoes"
            ref={observationsRef}
            name="observations"
            rows={2}
            maxLength={2000}
            enterKeyHint="done"
            value={observations}
            disabled={pending}
            onChange={(event) => setObservations(event.target.value)}
            placeholder={"Ex.: sem salada · troco para 50"}
            className={`${inputClass} mt-1.5 min-h-[72px] resize-none overflow-hidden leading-relaxed`}
          />
        </div>
      </div>

      {/*
       * Itens da nota: seção sempre visível.
       * Prato, Valor, Baião sempre visíveis; "Funcionário / item" via modal.
       */}
      <section
        aria-labelledby="itens-heading"
        className="mt-4 [@media(max-height:30rem)]:mt-3"
      >
        <h2 id="itens-heading" className={labelClass}>
          Itens da nota
        </h2>

        <div
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            if ((event.target as HTMLElement).tagName === "BUTTON") return;

            event.preventDefault();
            if (event.target === itemNameRef.current) {
              itemValueRef.current?.focus();
              return;
            }
            handleAddItem();
          }}
          className="mt-2 rounded-xl border border-line bg-surface p-3 [@media(max-height:30rem)]:p-2.5"
        >
          {itemError ? (
            <div
              role="alert"
              aria-live="assertive"
              className={`${errorBoxClass} mb-3`}
            >
              <IconAlert size={18} className="mt-0.5 shrink-0" />
              <span>{itemError}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 [@media(min-width:26rem)]:grid-cols-2 [@media(max-height:30rem)]:gap-2">
            {/* Prato - sempre visível */}
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
                {dishTags.map((tag) => {
                  return (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  );
                })}
              </select>
              {dishTags.length === 0 ? (
                <p className="mt-1 text-[12px] text-ink-soft">
                  Nenhum prato cadastrado ainda.
                </p>
              ) : null}
            </div>

            {/* Valor do item - sempre visível */}
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

            {/* Baião - sempre visível */}
            <fieldset className="[@media(min-width:26rem)]:col-span-2">
              <legend className={labelClass}>Baião</legend>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {BAIAO_OPTIONS.map((option) => {
                  return (
                    <label
                      key={option.value}
                      className="relative flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface px-2 text-center text-[13px] font-medium text-ink transition-colors duration-150 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand"
                    >
                      <input
                        type="radio"
                        name={baiaoGroupName}
                        value={option.value}
                        checked={itemBaiao === option.value}
                        disabled={pending}
                        onChange={() => setItemBaiao(option.value)}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Funcionário / item - retrátil */}
            <div className="[@media(min-width:26rem)]:col-span-2">
              {itemNameOpen ? (
                <>
                  <label htmlFor="item-nome" className={labelClass}>
                    Funcionário / item
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
                    placeholder="Ex.: Targino ou marmita"
                    className={`${inputClass} mt-1.5`}
                  />
                </>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setItemNameOpen(true)}
                  disabled={pending}
                  className="w-full"
                >
                  <IconPlus size={18} />
                  + Funcionário / item
                </Button>
                )}
              </div>
            </div>

            <Button
              variant="primary"
              className="mt-3"
              fullWidth
              onClick={handleAddItem}
              disabled={pending}
            >
              <IconPlus size={18} />
              Adicionar item
            </Button>
          </div>

        {/* Lista de itens adicionados */}
        {items.length > 0 ? (
          <>
            <ul className="mt-3 space-y-2">
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
            <p className="mt-0.5 text-right text-[12px] text-ink-soft">
              O total da nota é a soma dos itens.
            </p>
          </>
        ) : (
          <p className="mt-2 text-[13px] text-ink-soft">
            Sem itens a nota fica sem valor definido na captura.
          </p>
        )}

        {/* Botão para adicionar Funcionário / Item via modal */}
        <div className="mt-4">
          <Button
            variant="ghost"
            fullWidth
            onClick={openItemModal}
            disabled={pending}
          >
            <IconPlus size={18} />
            + Funcionário / item
          </Button>
        </div>
      </section>

      {/* Modal para adicionar Funcionário / Item */}
      <Modal
        open={itemModalOpen}
        onClose={closeItemModal}
        title="Adicionar Funcionário / Item"
        description="Preencha os dados do funcionário e do item do pedido."
        footer={
          <>
            <Button
              variant="ghost"
              className="flex-1"
              onClick={closeItemModal}
              disabled={modalPending}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleAddItemModal}
              disabled={modalPending}
            >
              {modalPending ? (
                <>
                  <IconSpinner size={18} />
                  Adicionando…
                </>
              ) : (
                "Confirmar e adicionar"
              )}
            </Button>
          </>
        }
      >
        {modalError ? (
          <div role="alert" aria-live="assertive" className={`${errorBoxClass} mb-4`}>
            <IconAlert size={18} className="mt-0.5 shrink-0" />
            <span>{modalError}</span>
          </div>
        ) : null}

        <div className="space-y-4">
          {/* Funcionário */}
          <div>
            <label htmlFor="modal-funcionario" className={labelClass}>
              Funcionário
            </label>
            <input
              id="modal-funcionario"
              type="text"
              maxLength={80}
              enterKeyHint="next"
              autoComplete="off"
              autoCapitalize="words"
              value={modalFuncionario}
              disabled={modalPending}
              onChange={(event) => {
                setModalError(null);
                setModalFuncionario(event.target.value);
              }}
              placeholder="Ex.: Targino"
              className={`${inputClass} mt-1.5`}
            />
          </div>

          {/* Item (nome do prato/funcionário) */}
          <div>
            <label htmlFor="modal-item-nome" className={labelClass}>
              Item / Funcionário
            </label>
            <input
              id="modal-item-nome"
              ref={itemNameRef}
              type="text"
              maxLength={80}
              enterKeyHint="next"
              autoComplete="off"
              autoCapitalize="words"
              value={modalItemName}
              disabled={modalPending}
              onChange={(event) => {
                setModalError(null);
                setModalItemName(event.target.value);
              }}
              placeholder="Ex.: Targino ou marmita"
              className={`${inputClass} mt-1.5`}
            />
          </div>

          {/* Prato */}
          <div>
            <label htmlFor="modal-item-prato" className={labelClass}>
              Prato
            </label>
            <select
              id="modal-item-prato"
              value={modalItemDishTagId}
              disabled={modalPending || dishTags.length === 0}
              onChange={(event) => setModalItemDishTagId(event.target.value)}
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

          {/* Valor do item */}
          <div>
            <label htmlFor="modal-item-valor" className={labelClass}>
              Valor do item
            </label>
            <CurrencyInput
              id="modal-item-valor"
              inputRef={itemValueRef}
              value={modalItemValueCents}
              onValueChange={(cents) => {
                setModalError(null);
                setModalItemValueCents(cents);
              }}
              disabled={modalPending}
            />
          </div>

          {/* Baião */}
          <fieldset>
            <legend className={labelClass}>Baião</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {BAIAO_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="relative flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface px-2 text-center text-[13px] font-medium text-ink transition-colors duration-150 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand"
                >
                  <input
                    type="radio"
                    name="modal-baiao-group"
                    value={option.value}
                    checked={modalItemBaiao === option.value}
                    disabled={modalPending}
                    onChange={() => setModalItemBaiao(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Modal>

      {/*
       * Rodapé: só o botão Salvar, no fluxo. Em altura curta o `mt` cai para
       * 8px, o que mantém a ação primária alcançável sem barra fixa cobrindo
       * campos em 667x375 e 844x390.
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