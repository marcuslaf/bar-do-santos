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
  IconSpinner,
} from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { errorBoxClass, inputClass, labelClass } from "@/components/ui/styles";
import { cancelOrder, deliverOrder, payOrder, updateOrder } from "@/lib/actions/orders";
import { formatCents } from "@/lib/format";
import {
  PAYMENT_METHOD_LABEL,
  type MemberRole,
  type Order,
  type PaymentMethod,
} from "@/lib/types";

const METHODS: PaymentMethod[] = [
  "dinheiro",
  "pix",
  "credito",
  "debito",
  "outro",
];

interface OrderActionsProps {
  order: Order;
  role: MemberRole;
}

export function OrderActions({ order, role }: OrderActionsProps) {
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [delivering, setDelivering] = useState(false);
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
          <Button variant="dangerGhost" onClick={() => setCancelOpen(true)}>
            <IconBan size={18} />
            Cancelar
          </Button>
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
    </section>
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
      description="Só é possível editar notas em aberto ou entregues."
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
