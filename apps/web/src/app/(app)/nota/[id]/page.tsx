import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { IconArrowLeft, IconClock } from "@/components/ui/icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { getOrder, getSession } from "@/lib/data";
import { formatCents, formatDate, formatTime, initials } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_METHOD_LABEL } from "@/lib/types";

import {
  OrderActions,
  OrderItems,
  type DishTagOption,
  type OrderItem,
} from "./order-actions";

export const metadata: Metadata = {
  title: "Nota",
};

type Params = Promise<{ id: string }>;

export default async function OrderDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const session = await getSession();
  if (!session) return null;

  const order = await getOrder(id);
  if (!order) notFound();

  const supabase = await createClient();
  const [{ data: items }, { data: dishTags }] = await Promise.all([
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("dish_tags").select("id, name").order("name", { ascending: true }),
  ]);

  const timeZone = session.timezone;
  const editable = order.status === "aberto" || order.status === "entregue";
  const manageable =
    order.status === "pago" || order.status === "cancelado";

  return (
    <div>
      <Link
        href="/"
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg pr-2 text-[14px] text-ink-soft transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <IconArrowLeft size={18} />
        Voltar para os pedidos
      </Link>

      {/*
       * A partir de 40rem a nota vira conteúdo + trilho de ações. Antes disso
       * (celular em pé) continua empilhado, mas as ações já não somem da tela
       * em altura curta porque o trilho fica ao lado do conteúdo.
       */}
      <div className="[@media(min-width:40rem)]:grid [@media(min-width:40rem)]:grid-cols-[minmax(0,1fr)_14rem] [@media(min-width:40rem)]:items-start [@media(min-width:40rem)]:gap-5">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 font-display text-[28px] leading-tight break-words text-ink [@media(max-height:30rem)]:text-[20px]">
              {order.customer_name}
            </h1>
            <StatusBadge status={order.status} className="mt-1.5 shrink-0" />
          </div>

          {/* Metadado secundário: em altura curta sai de cena para a nota caber. */}
          <div className="mt-2 flex items-center gap-2 [@media(max-height:30rem)]:hidden">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-ink-soft"
            >
              {initials(order.author_name ?? "?")}
            </span>
            <p className="min-w-0 text-[13px] leading-snug text-ink-soft">
              <span className="font-medium text-ink">
                {order.author_name ?? "Sem autor"}
              </span>
              <span aria-hidden> · </span>
              <time dateTime={order.created_at} className="tabular">
                {formatDate(order.day_key, timeZone)} às{" "}
                {formatTime(order.created_at, timeZone)}
              </time>
            </p>
          </div>

          {order.status === "pago" ? (
            <div
              role="status"
              className="mt-4 rounded-xl border border-ok/25 bg-ok-soft px-4 py-3 text-[14px] text-ok"
            >
              <p className="font-semibold">
                Pago
                {order.payment_method
                  ? ` · ${PAYMENT_METHOD_LABEL[order.payment_method]}`
                  : ""}
                {order.paid_at
                  ? ` às ${formatTime(order.paid_at, timeZone)}`
                  : ""}
              </p>
              <p className="mt-0.5 text-[13px]">Nota fechada — somente leitura.</p>
            </div>
          ) : null}

          {order.status === "cancelado" ? (
            <div
              role="status"
              className="mt-4 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-danger"
            >
              <p className="text-[14px] font-semibold">
                Nota cancelada
                {order.canceled_at
                  ? ` às ${formatTime(order.canceled_at, timeZone)}`
                  : ""}
              </p>
              {order.cancel_reason ? (
                <p className="mt-1 text-[14px] leading-relaxed break-words">
                  Motivo: {order.cancel_reason}
                </p>
              ) : null}
            </div>
          ) : null}

          {order.status === "entregue" ? (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-info">
              <IconClock size={16} />
              Entregue
              {order.delivered_at
                ? ` às ${formatTime(order.delivered_at, timeZone)}`
                : ""}
            </p>
          ) : null}

          <section
            aria-label="Pedido"
            className="mt-4 rounded-2xl border border-line bg-surface p-4 shadow-card [@media(max-height:30rem)]:mt-2 [@media(max-height:30rem)]:max-h-28 [@media(max-height:30rem)]:overflow-y-auto [@media(max-height:30rem)]:p-3"
          >
            <p className="text-[17px] leading-relaxed break-words whitespace-pre-wrap text-ink">
              {order.description}
            </p>
          </section>

          {/* Em altura curta o valor já aparece no botão "Receber R$ …". */}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 [@media(max-height:30rem)]:hidden">
            <span className="text-[13px] font-semibold tracking-[0.08em] text-ink-soft uppercase">
              Valor
            </span>
            {order.total_cents !== null ? (
              <span className="tabular font-display text-[21px] leading-none text-ink">
                {formatCents(order.total_cents)}
              </span>
            ) : (
              <span className="text-[14px] text-ink-soft">Não informado</span>
            )}
          </div>

          <OrderItems
            orderId={order.id}
            items={(items ?? []) as OrderItem[]}
            dishTags={(dishTags ?? []) as DishTagOption[]}
          />
        </div>

        {(editable || manageable) ? (
          <div className="[@media(min-width:40rem)]:sticky [@media(min-width:40rem)]:top-[4.5rem]">
            <OrderActions order={order} role={session.role} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
