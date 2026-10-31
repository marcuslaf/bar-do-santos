import type { Metadata } from "next";
import Link from "next/link";

import { IconArrowLeft, IconNote } from "@/components/ui/icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonClass } from "@/components/ui/styles";
import { getSession } from "@/lib/data";
import {
  BAIAO_OPTION_LABEL,
  type BaiaoOption,
  type DishTag,
  type OrderItemRow,
} from "@/lib/dish-tags";
import { formatCents, formatDate, formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

import { FilterControls } from "./filter-controls";

export const metadata: Metadata = {
  title: "Filtros",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parseBaiao(value: string): "" | BaiaoOption {
  return value === "com" || value === "sem" ? value : "";
}

interface OrderRow {
  order: Order;
  items: OrderItemRow[];
}

export default async function FiltersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const dishId = first(params.prato).slice(0, 40);
  const baiao = parseBaiao(first(params.baiao));

  const session = await getSession();
  if (!session) return null;

  const supabase = await createClient();

  /*
   * Sem `day_key`: filtrar prato é consulta de histórico, não do caderno do dia.
   * Os itens vêm soltos e o encontro com a nota é feito em memória — o volume
   * de um bar cabe nisso com folga e evita uma segunda ida ao banco por nota.
   */
  const [tagsResult, ordersResult, itemsResult] = await Promise.all([
    supabase.from("dish_tags").select("id, name").order("name", { ascending: true }),
    supabase
      .from("orders_view")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("order_items").select("*").limit(2000),
  ]);

  if (tagsResult.error) {
    throw new Error(`Falha ao carregar os pratos: ${tagsResult.error.message}`);
  }
  if (ordersResult.error) {
    throw new Error(`Falha ao carregar as notas: ${ordersResult.error.message}`);
  }
  if (itemsResult.error) {
    throw new Error(
      `Falha ao carregar os itens das notas: ${itemsResult.error.message}`,
    );
  }

  const tags = (tagsResult.data ?? []) as DishTag[];
  const orders = (ordersResult.data ?? []) as Order[];
  const items = (itemsResult.data ?? []) as OrderItemRow[];

  const dishNames = new Map(tags.map((tag) => [tag.id, tag.name]));

  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of items) {
    const bucket = itemsByOrder.get(item.order_id);
    if (bucket) {
      bucket.push(item);
    } else {
      itemsByOrder.set(item.order_id, [item]);
    }
  }

  const matchesFilter = (item: OrderItemRow): boolean =>
    (dishId === "" || item.dish_tag_id === dishId) &&
    (baiao === "" || item["baião_option"] === baiao);

  const rows: OrderRow[] = [];
  for (const order of orders) {
    const matched = (itemsByOrder.get(order.id) ?? []).filter(matchesFilter);
    // Só entra quem tem ao menos um item que satisfaça o filtro.
    if (matched.length > 0) rows.push({ order, items: matched });
  }

  const itemCount = rows.reduce((total, row) => total + row.items.length, 0);
  const hasFilter = dishId !== "" || baiao !== "";
  const timeZone = session.timezone;

  return (
    <div>
      <div className="flex flex-col [@media(max-height:30rem)]:flex-row [@media(max-height:30rem)]:items-center [@media(max-height:30rem)]:gap-3 [@media(max-width:22.5rem)]:flex-row [@media(max-width:22.5rem)]:items-center [@media(max-width:22.5rem)]:gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg pr-2 text-[14px] text-ink-soft transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <IconArrowLeft size={18} />
          Voltar
        </Link>

        <h1 className="mt-1 font-display text-[27px] leading-tight text-ink [@media(max-height:30rem)]:mt-0 [@media(max-height:30rem)]:text-[22px] [@media(max-width:22.5rem)]:mt-0 [@media(max-width:22.5rem)]:text-[24px]">
          Filtros
        </h1>
      </div>

      <p className="mt-1.5 text-[13px] text-ink-soft">
        Notas que têm pelo menos um item com o prato e o baião escolhidos.
      </p>

      <FilterControls tags={tags} initialDish={dishId} initialBaiao={baiao} />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p aria-live="polite" className="text-[13px] text-ink-soft">
          {rows.length} {rows.length === 1 ? "nota" : "notas"}
          <span aria-hidden> · </span>
          {itemCount} {itemCount === 1 ? "item" : "itens"}
        </p>

        {hasFilter ? (
          <Link
            href="/filtros"
            className="inline-flex min-h-11 items-center rounded-lg px-1 text-[13px] font-medium text-brand-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Limpar filtros
          </Link>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState hasFilter={hasFilter} hasTags={tags.length > 0} role={session.role} />
      ) : (
        <ul className="mt-2 grid grid-cols-1 items-start gap-2.5 pb-2 sm:grid-cols-2">
          {rows.map(({ order, items: orderItems }) => (
            <li key={order.id} className="min-w-0">
              <Link
                href={`/nota/${order.id}`}
                className="block min-h-11 rounded-2xl border border-line bg-surface p-3.5 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-snug font-medium break-words text-ink">
                      {order.customer_name}
                    </p>
                    {/* Mostrar funcionários que participaram do pedido */}
                    {(() => {
                      const funcionarios = new Set(
                        orderItems
                          .map((item) => item.funcionario)
                          .filter((f): f is string => Boolean(f))
                      );
                      if (funcionarios.size > 0) {
                        return (
                          <p className="mt-0.5 text-[12px] text-ink-soft">
                            {Array.from(funcionarios).join(" · ")}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <StatusBadge status={order.status} className="shrink-0" />
                </div>

                <ul className="mt-1.5 space-y-0.5">
                  {orderItems.map((item) => {
                    const dishName = item.dish_tag_id
                      ? (dishNames.get(item.dish_tag_id) ?? item.item_name)
                      : item.item_name;
                    const baiaoLabel = item["baião_option"]
                      ? BAIAO_OPTION_LABEL[item["baião_option"]]
                      : "Baião não informado";
                    const funcionario = item.funcionario
                      ? item.funcionario
                      : null;

                    return (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-baseline gap-x-1.5 text-[13px] leading-snug text-ink-soft"
                      >
                        <span className="font-medium break-words text-ink">
                          {dishName}
                        </span>
                        {funcionario ? (
                          <>
                            <span aria-hidden>·</span>
                            <span className="text-ink-soft">{funcionario}</span>
                          </>) : null}
                        <span aria-hidden>·</span>
                        <span>{baiaoLabel}</span>
                        <span aria-hidden>·</span>
                        <span className="tabular">
                          {formatCents(item.unit_price_cents)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-line pt-2 text-[12px] text-ink-soft">
                  <span>
                    Total{" "}
                    <strong className="tabular font-semibold text-ink">
                      {formatCents(order.total_cents)}
                    </strong>
                  </span>
                  <time dateTime={order.created_at} className="tabular">
                    <span className="capitalize">
                      {formatDate(order.day_key, timeZone)}
                    </span>
                    {" · "}
                    {formatTime(order.created_at, timeZone)}
                  </time>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({
  hasFilter,
  hasTags,
  role,
}: {
  hasFilter: boolean;
  hasTags: boolean;
  role: "owner" | "staff";
}) {
  const copy = !hasTags
    ? {
        title: "Nenhum prato cadastrado",
        body:
          role === "owner"
            ? "Cadastre os pratos para poder filtrar as notas por item."
            : "Peça ao dono para cadastrar os pratos do bar.",
      }
    : hasFilter
    ? {
        title: "Nenhuma nota com esse filtro",
        body: "Nenhum item registrado combina com o prato e o baião escolhidos.",
      }
    : {
        title: "Nenhum item registrado",
        body: "Quando as notas tiverem itens com prato e baião, eles aparecem aqui.",
      };

  return (
    <div className="mt-2 rounded-2xl border border-dashed border-line-strong bg-surface/60 px-5 py-9 text-center">
      <span
        aria-hidden="true"
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-ink"
      >
        <IconNote size={24} />
      </span>
      <h2 className="mt-3 font-display text-[20px] text-ink">{copy.title}</h2>
      <p className="mx-auto mt-1 max-w-[34ch] text-[15px] leading-relaxed text-ink-soft">
        {copy.body}
      </p>

      {!hasTags && role === "owner" ? (
        <Link
          href="/tags"
          className={`${buttonClass({ variant: "secondary" })} mt-4`}
        >
          Cadastrar pratos
        </Link>
      ) : hasFilter ? (
        <Link
          href="/filtros"
          className={`${buttonClass({ variant: "secondary" })} mt-4`}
        >
          Limpar filtros
        </Link>
      ) : null}
    </div>
  );
}