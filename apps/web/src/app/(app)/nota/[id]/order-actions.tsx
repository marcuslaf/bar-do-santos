"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  IconAlert,
  IconBan,
  IconCash,
  IconCheck,
  IconPencil,
  IconPlus,
  IconSpinner,
  IconX,
} from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { errorBoxClass, inputClass, labelClass } from "@/components/ui/styles";
import {
  createOrderItem,
  deleteOrderItem,
  updateOrderItem,
} from "@/lib/actions/order-items";
import { cancelOrder, deleteOrder, deliverOrder, payOrder, updateOrder } from "@/lib/actions/orders";
import { formatCents } from "@/lib/format";
import {
  PAYMENT_METHOD_LABEL,
  type BaiãoOption,
  type MemberRole,
  type Order,
  type OrderItemInput,
  type PaymentMethod,
} from "@/lib/types";

const METHODS: PaymentMethod[] = [
  "dinheiro",
  "pix",
  "credito",
  "debito",
  "outro",
];

/** "nao" é o estado de interface; no payload vira `null` (não informado). */
type BaiaoChoice = BaiãoOption | "nao";

const BAIAO_OPTIONS: { value: BaiaoChoice; label: string }[] = [
  { value: "com", label: "Com baião" },
  { value: "sem", label: "Sem baião" },
  { value: "nao", label: "Não informado" },
];

export interface OrderItem {
  id: string;
  order_id: string;
  item_name: string;
  dish_tag_id: string | null;
  baião_option: "com" | "sem" | null;
  unit_price_cents: number;
  created_at: string;
}

export interface DishTagOption {
  id: string;
  name: string;
}

interface OrderActionsProps {
  order: Order;
  role: MemberRole;
}

export function OrderActions({ order, role }: OrderActionsProps) {
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDeliver() {
    if (delivering) return;
    setActionError(null);
    setDelivering(true);

    try {
      const result = await deliverOrder(order.id);
      if (!result.ok) {
        setActionError(result.error ?? "Não foi possível marcar como entregue.");
        return;
      }
      router.refresh();
    } catch {
      setActionError("Falha de conexão. Tente novamente.");
    } finally {
      setDelivering(false);
    }
  }

  return (
    <section
      aria-label="Ações da nota"
      className="mt-5 space-y-2.5 [@media(min-width:40rem)]:mt-0 [@media(max-height:30rem)]:space-y-2"
    >
      {actionError ? (
        <div role="alert" aria-live="assertive" className={errorBoxClass}>
          <IconAlert size={18} className="mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      ) : null}

      {/*
       * Itens da nota: a lista e os controles individuais vivem no mesmo
       * bloco, então o dono/atendente consegue ajustar item mesmo depois do
       * pagamento ou do cancelamento — cortar acesso é outra ação.
       */}
      {order.status === "aberto" ? (
        <Button
          size="lg"
          fullWidth
          onClick={handleDeliver}
          disabled={delivering}
        >
          {delivering ? (
            <>
              <IconSpinner size={20} />
              Marcando…
            </>
          ) : (
            <>
              <IconCheck size={20} />
              Marcar entregue
            </>
          )}
        </Button>
      ) : null}

      <Button
        size="lg"
        fullWidth
        variant={order.status === "entregue" ? "primary" : "secondary"}
        onClick={() => setPayOpen(true)}
      >
        <IconCash size={20} />
        {order.total_cents !== null
          ? `Receber ${formatCents(order.total_cents)}`
          : "Registrar pagamento"}
      </Button>

      <div className="grid grid-cols-2 gap-2.5 [@media(max-height:30rem)]:gap-2">
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          <IconPencil size={18} />
          Editar
        </Button>

        {role === "owner" ? (
          <>
            {(order.status === "aberto" || order.status === "entregue") && (
              <Button variant="dangerGhost" onClick={() => setCancelOpen(true)}>
                <IconBan size={18} />
                Cancelar
              </Button>
            )}
            {(order.status === "pago" || order.status === "cancelado") && (
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                <IconX size={18} />
                Excluir
              </Button>
            )}
          </>
        ) : null}
      </div>

      {payOpen ? (
        <PayDialog order={order} onClose={() => setPayOpen(false)} />
      ) : null}
      {editOpen ? (
        <EditDialog order={order} onClose={() => setEditOpen(false)} />
      ) : null}
      {cancelOpen ? (
        <CancelDialog order={order} onClose={() => setCancelOpen(false)} />
      ) : null}

      {deleteOpen ? (
        <DeleteDialog order={order} open={deleteOpen} onClose={() => setDeleteOpen(false)} />
      ) : null}
    </section>
  );
}

/**
 * Itens da nota: lista + controles individuais. Fica na coluna de conteúdo (não
 * no trilho de ações) para a lista respirar, e aparece em qualquer status — o
 * dono e o atendente ajustam item mesmo em nota paga ou cancelada.
 */
export function OrderItems({
  orderId,
  items,
  dishTags,
}: {
  orderId: string;
  items: OrderItem[];
  dishTags: DishTagOption[];
}) {
  const [itemDialog, setItemDialog] = useState<
    { mode: "create" } | { mode: "edit"; item: OrderItem } | null
  >(null);
  const [itemToDelete, setItemToDelete] = useState<OrderItem | null>(null);

  const dishTagName = (id: string | null) =>
    id ? (dishTags.find((tag) => tag.id === id)?.name ?? null) : null;

  return (
    <>
      <section
        aria-label="Itens da nota"
        className="mt-3 rounded-2xl border border-line bg-surface p-4 [@media(max-height:30rem)]:mt-2 [@media(max-height:30rem)]:p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[13px] font-semibold tracking-[0.08em] text-ink-soft uppercase">
            Itens
          </h2>
          <Button
            size="compact"
            variant="secondary"
            onClick={() => setItemDialog({ mode: "create" })}
          >
            <IconPlus size={16} />
            Item
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="mt-2 text-[13px] text-ink-soft">
            Nenhum item nesta nota.
          </p>
        ) : (
          <ul className="mt-1 divide-y divide-line">
            {items.map((item) => {
              const dish = dishTagName(item.dish_tag_id);
              const baiao =
                item.baião_option === "com"
                  ? "com baião"
                  : item.baião_option === "sem"
                    ? "sem baião"
                    : null;
              const meta = [dish, baiao].filter(Boolean).join(" · ");

              return (
                <li key={item.id} className="py-1.5 first:pt-0.5 last:pb-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] leading-snug font-medium break-words text-ink">
                        {item.item_name}
                      </p>
                      <p className="truncate text-[12px] text-ink-soft">
                        {meta || "Sem prato definido"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <span className="tabular text-[15px] text-ink">
                        {formatCents(item.unit_price_cents)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setItemDialog({ mode: "edit", item })}
                        aria-label={`Editar item ${item.item_name}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-soft transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      >
                        <IconPencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemToDelete(item)}
                        aria-label={`Excluir item ${item.item_name}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-danger transition-colors duration-150 hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      >
                        <IconX size={16} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {itemDialog ? (
        <ItemDialog
          orderId={orderId}
          item={itemDialog.mode === "edit" ? itemDialog.item : null}
          dishTags={dishTags}
          onClose={() => setItemDialog(null)}
        />
      ) : null}

      {itemToDelete ? (
        <DeleteItemDialog
          item={itemToDelete}
          onClose={() => setItemToDelete(null)}
        />
      ) : null}
    </>
  );
}

function ItemDialog({
  orderId,
  item,
  dishTags,
  onClose,
}: {
  orderId: string;
  item: OrderItem | null;
  dishTags: DishTagOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [itemName, setItemName] = useState(item?.item_name ?? "");
  const [dishTagId, setDishTagId] = useState(item?.dish_tag_id ?? "");
  const [baiao, setBaiao] = useState<BaiaoChoice>(item?.baião_option ?? "nao");
  const [value, setValue] = useState<number | null>(
    item?.unit_price_cents ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (pending) return;

    const name = itemName.trim();
    if (!name) {
      setError("Informe o nome do item.");
      return;
    }
    if (value === null) {
      setError("Informe o valor do item.");
      return;
    }

    const input: OrderItemInput = {
      itemName: name,
      dishTagId: dishTagId || null,
      baiãoOption: baiao === "nao" ? null : baiao,
      unitPriceCents: value,
    };

    setError(null);
    setPending(true);

    try {
      const result = item
        ? await updateOrderItem({ id: item.id, ...input })
        : await createOrderItem({ orderId, ...input });
      if (!result.ok) {
        setError(result.error ?? "Não foi possível salvar o item.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? "Editar item" : "Adicionar item"}
      description={
        item
          ? "Altere o nome, o prato, o baião ou o valor deste item."
          : "Cada item tem seu próprio nome, prato, baião e valor."
      }
      footer={
        <>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={pending}
          >
            Voltar
          </Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={pending}>
            {pending ? (
              <>
                <IconSpinner size={18} />
                Salvando…
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </>
      }
    >
      {error ? (
        <div role="alert" aria-live="assertive" className={`${errorBoxClass} mb-4`}>
          <IconAlert size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <label htmlFor="item-nome" className={labelClass}>
            Nome do item
          </label>
          <input
            id="item-nome"
            data-autofocus
            type="text"
            maxLength={80}
            enterKeyHint="next"
            autoComplete="off"
            autoCapitalize="words"
            value={itemName}
            disabled={pending}
            onChange={(event) => setItemName(event.target.value)}
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
            value={dishTagId}
            disabled={pending || dishTags.length === 0}
            onChange={(event) => setDishTagId(event.target.value)}
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
            <p className="mt-1 text-[13px] text-ink-soft">
              Nenhum prato cadastrado ainda.
            </p>
          ) : null}
        </div>

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
                  name="item-baiao"
                  value={option.value}
                  checked={baiao === option.value}
                  disabled={pending}
                  onChange={() => setBaiao(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="item-valor" className={labelClass}>
            Valor do item
          </label>
          <CurrencyInput
            id="item-valor"
            value={value}
            onValueChange={setValue}
            disabled={pending}
          />
        </div>
      </div>
    </Modal>
  );
}

function DeleteItemDialog({
  item,
  onClose,
}: {
  item: OrderItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (deleting) return;
    setError(null);
    setDeleting(true);

    try {
      const result = await deleteOrderItem({ id: item.id });
      if (!result.ok) {
        setError(result.error ?? "Não foi possível excluir o item.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Excluir item"
      description={`O item ${item.item_name} será removido desta nota.`}
      footer={
        <>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={deleting}
          >
            Manter item
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <IconSpinner size={18} />
                Excluindo…
              </>
            ) : (
              "Excluir item"
            )}
          </Button>
        </>
      }
    >
      {error ? (
        <div role="alert" aria-live="assertive" className={`${errorBoxClass} mb-4`}>
          <IconAlert size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      <p className="text-[13px] text-ink-soft">
        O valor deste item deixa de somar na nota.
      </p>
    </Modal>
  );
}

function PayDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState<number | null>(order.total_cents);
  const [method, setMethod] = useState<PaymentMethod>(
    order.payment_method ?? "dinheiro",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (pending) return;

    if (value === null) {
      setError("Informe o valor recebido.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const result = await payOrder(order.id, { totalCents: value, method });
      if (!result.ok) {
        setError(result.error ?? "Não foi possível registrar o pagamento.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar pagamento"
      description={`Nota de ${order.customer_name}`}
      footer={
        <>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={pending}
          >
            Voltar
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? (
              <>
                <IconSpinner size={18} />
                Salvando…
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </>
      }
    >
      {error ? (
        <div role="alert" aria-live="assertive" className={`${errorBoxClass} mb-4`}>
          <IconAlert size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <label htmlFor="valor-recebido" className={labelClass}>
        Valor recebido
      </label>
      <CurrencyInput
        id="valor-recebido"
        autoFocusOnOpen
        value={value}
        onValueChange={setValue}
        disabled={pending}
      />

      <fieldset className="mt-4">
        <legend className={labelClass}>Forma de pagamento</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {METHODS.map((option) => (
            <label
              key={option}
              className="relative flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface px-3 text-[15px] font-medium text-ink transition-colors duration-150 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand"
            >
              <input
                type="radio"
                name="payment-method"
                value={option}
                checked={method === option}
                disabled={pending}
                onChange={() => setMethod(option)}
                className="sr-only"
              />
              {PAYMENT_METHOD_LABEL[option]}
            </label>
          ))}
        </div>
      </fieldset>
    </Modal>
  );
}

function EditDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState(order.customer_name);
  const [description, setDescription] = useState(order.description);
  const [value, setValue] = useState<number | null>(order.total_cents);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (pending) return;

    const name = customerName.trim();
    const text = description.trim();
    if (!name) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (!text) {
      setError("Escreva o pedido.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const result = await updateOrder(order.id, {
        customerName: name,
        description: text,
        totalCents: value,
      });
      if (!result.ok) {
        setError(result.error ?? "Não foi possível salvar as alterações.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar nota"
      description="Altere o nome do cliente, a descrição ou o valor da nota."
      footer={
        <>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={pending}
          >
            Voltar
          </Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={pending}>
            {pending ? (
              <>
                <IconSpinner size={18} />
                Salvando…
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </>
      }
    >
      {error ? (
        <div role="alert" aria-live="assertive" className={`${errorBoxClass} mb-4`}>
          <IconAlert size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <label htmlFor="editar-cliente" className={labelClass}>
            Nome do cliente
          </label>
          <input
            id="editar-cliente"
            data-autofocus
            type="text"
            maxLength={80}
            enterKeyHint="next"
            value={customerName}
            disabled={pending}
            onChange={(event) => setCustomerName(event.target.value)}
            className={`${inputClass} mt-1.5`}
          />
        </div>

        <div>
          <label htmlFor="editar-pedido" className={labelClass}>
            Pedido
          </label>
          <textarea
            id="editar-pedido"
            rows={4}
            maxLength={2000}
            value={description}
            disabled={pending}
            onChange={(event) => setDescription(event.target.value)}
            className={`${inputClass} mt-1.5 min-h-[120px] resize-none leading-relaxed`}
          />
        </div>

        <div>
          <label htmlFor="editar-valor" className={labelClass}>
            Valor (opcional)
          </label>
          <CurrencyInput
            id="editar-valor"
            value={value}
            onValueChange={setValue}
            disabled={pending}
            describedBy="editar-valor-ajuda"
          />
          <p id="editar-valor-ajuda" className="mt-1 text-[13px] text-ink-soft">
            Deixe em branco para não informar valor.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function CancelDialog({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const trimmed = reason.trim();
  const canConfirm = trimmed.length >= 3;

  async function handleConfirm() {
    if (pending) return;
    if (!canConfirm) {
      setError("Descreva o motivo do cancelamento.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const result = await cancelOrder(order.id, trimmed);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível cancelar a nota.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Cancelar nota"
      description={`A nota de ${order.customer_name} será marcada como cancelada.`}
      footer={
        <>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={pending}
          >
            Manter nota
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleConfirm}
            disabled={pending || !canConfirm}
          >
            {pending ? (
              <>
                <IconSpinner size={18} />
                Cancelando…
              </>
            ) : (
              "Cancelar nota"
            )}
          </Button>
        </>
      }
    >
      {error ? (
        <div role="alert" aria-live="assertive" className={`${errorBoxClass} mb-4`}>
          <IconAlert size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <label htmlFor="motivo" className={labelClass}>
        Motivo do cancelamento
      </label>
      <textarea
        id="motivo"
        data-autofocus
        rows={3}
        maxLength={300}
        value={reason}
        disabled={pending}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Ex.: cliente desistiu do pedido"
        className={`${inputClass} mt-1.5 min-h-[92px] resize-none leading-relaxed`}
      />
      <p className="mt-1 text-[13px] text-ink-soft">
        O motivo fica registrado no fechamento do caixa.
      </p>
    </Modal>
  );
}

function DeleteDialog({
  order,
  open,
  onClose,
}: {
  order: Order;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (deleting) return;
    setError(null);
    setDeleting(true);

    try {
      const result = await deleteOrder(order.id);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível excluir a nota.");
        return;
      }
      onClose();
      router.push("/");
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Excluir nota"
      description={`A nota de ${order.customer_name} será permanentemente removida.`}
      footer={
        <>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={deleting}
          >
            Manter nota
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <IconSpinner size={18} />
                Excluindo…
              </>
            ) : (
              "Excluir nota"
            )}
          </Button>
        </>
      }
    >
      {error ? (
        <div role="alert" aria-live="assertive" className={`${errorBoxClass} mb-4`}>
          <IconAlert size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      <p className="text-[13px] text-ink-soft">
        Esta ação não pode ser desfeita. O pedido será removido do sistema.
      </p>
    </Modal>
  );
}
