import type { Metadata } from "next";
import Link from "next/link";

import { OrderCard } from "@/components/orders/order-card";
import { OrderSearch } from "@/components/orders/order-search";
import { OrdersRealtime } from "@/components/realtime/orders-realtime";
import { IconNote, IconPlus } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/styles";
import { getBusinessDay, getDayOrders, getSession } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Hoje",
};

type Filter = "todos" | "abertos" | "prontos";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parseFilter(value: string): Filter {
  return value === "abertos" || value === "prontos" ? value : "todos";
}

function filterHref(filter: Filter, q: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (filter !== "todos") params.set("status", filter);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = first(params.q).slice(0, 60);
  const filter = parseFilter(first(params.status));

  const session = await getSession();
  if (!session) return null;

  const [orders, day] = await Promise.all([
    getDayOrders(query),
    getBusinessDay(),
  ]);

  const openOrders = orders.filter((order) => order.status === "aberto");
  const readyOrders = orders.filter((order) => order.status === "entregue");

  const visible =
    filter === "abertos"
      ? openOrders
      : filter === "prontos"
        ? readyOrders
        : orders;

  const chips = [
    { key: "todos" as const, label: "Todos", count: orders.length },
    { key: "abertos" as const, label: "Abertos", count: openOrders.length },
    { key: "prontos" as const, label: "Prontos", count: readyOrders.length },
  ];

  /*
   * Com o caderno em branco (sem busca, sem filtro) o estado vazio já traz o
   * CTA "Anotar primeira nota" no meio da tela; o FAB logo abaixo virava uma
   * segunda porta para a mesma ação e cobria o canto do card. Nos demais casos
   * (notas filtradas, busca sem resultado) o FAB é a única saída para anotar.
   */
  const showFab = !(orders.length === 0 && query === "" && filter === "todos");

  return (
    <div>
      <OrdersRealtime orgId={session.orgId} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[27px] leading-tight text-ink">
            Pedidos
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-soft">
            <span className="capitalize">
              {formatDate(day, session.timezone)}
            </span>
            <span aria-hidden> · </span>
            {orders.length} {orders.length === 1 ? "nota" : "notas"}
            {openOrders.length > 0 ? (
              <>
                <span aria-hidden> · </span>
                {openOrders.length} em aberto
              </>
            ) : null}
          </p>
        </div>

        {/* No desktop a ação principal vive no fluxo, ao lado do título. */}
        <Link
          href="/nova"
          className="hidden shrink-0 items-center gap-2 rounded-xl bg-brand px-4 text-[15px] font-semibold whitespace-nowrap text-on-brand transition-colors duration-150 hover:bg-brand-strong active:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:inline-flex md:min-h-11"
        >
          <IconPlus size={19} />
          Nova nota
        </Link>
      </div>

      {orders.length === 0 && query === "" ? null : (
        <>
          <OrderSearch initialQuery={query} status={filter} />

          <div
            role="group"
            aria-label="Filtrar notas por situação"
            className="mt-3 flex gap-2 overflow-x-auto pb-0.5"
          >
            {chips.map((chip) => {
              const active = filter === chip.key;
              return (
                <Link
                  key={chip.key}
                  href={filterHref(chip.key, query)}
                  aria-current={active ? "true" : undefined}
                  className={[
                    "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition-colors duration-150",
                    active
                      ? "border-brand bg-brand text-on-brand"
                      : "border-line-strong bg-surface text-ink hover:bg-surface-2",
                  ].join(" ")}
                >
                  {chip.label}
                  <span
                    className={[
                      "tabular text-[12px] font-semibold",
                      active ? "text-on-brand" : "text-ink-soft",
                    ].join(" ")}
                  >
                    {chip.count}
                  </span>
                </Link>
              );
            })}
          </div>

          {query ? (
            <p className="mt-2 text-[13px] text-ink-soft">
              Resultados para{" "}
              <strong className="font-semibold text-ink">“{query}”</strong>
              {" · "}
              <Link
                href={filterHref(filter, "")}
                className="text-brand-ink underline underline-offset-2"
              >
                limpar busca
              </Link>
            </p>
          ) : null}
        </>
      )}

      {/*
       * 2 colunas a partir de 640px: com 320–630px de sobra no desktop, notas
       * curtas em coluna única viravam uma faixa estreita no meio da tela.
       */}
      {/*
       * Duas colunas no tablet/desktop. `items-start` deixa cada nota com a
       * altura do próprio texto: esticar todas até a mais alta abria um vazio
       * grande dentro das notas curtas (parecia bug de layout).
       */}
      <div className="mt-4 grid grid-cols-1 items-start gap-3 pb-20 sm:grid-cols-2 md:pb-2">
        {visible.length === 0 ? (
          <div className="sm:col-span-2">
            <EmptyState query={query} filter={filter} />
          </div>
        ) : (
          visible.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              timeZone={session.timezone}
            />
          ))
        )}
      </div>

      {/* Celular: CTA flutuante acima da barra de navegação. */}
      {showFab ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem_+_env(safe-area-inset-bottom))] z-30 md:hidden">
          <div className="mx-auto flex w-full max-w-3xl justify-end px-4">
            <Link
              href="/nova"
              className="pointer-events-auto inline-flex min-h-14 items-center gap-2 rounded-full bg-brand px-5 text-on-brand shadow-float transition-colors duration-150 hover:bg-brand-strong active:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <IconPlus size={22} />
              <span className="text-[15px] font-semibold">Nova nota</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ query, filter }: { query: string; filter: Filter }) {
  const copy = query
    ? {
        title: "Nada encontrado",
        body: `Nenhuma nota combina com “${query}”. Tente outro nome ou trecho do pedido.`,
      }
    : filter === "abertos"
      ? {
          title: "Nenhuma nota em aberto",
          body: "Tudo entregue por aqui. As novas notas do dia aparecem nesta lista.",
        }
      : filter === "prontos"
        ? {
            title: "Nenhuma nota pronta",
            body: "Quando uma nota for marcada como entregue, ela aparece aqui.",
          }
        : {
            title: "O caderno está em branco",
            body: "Anote o primeiro pedido do dia. Leva menos de meio minuto.",
          };

  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface/60 px-5 py-10 text-center">
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
      {query ? (
        <Link
          href={filterHref(filter, "")}
          className={`${buttonClass({ variant: "secondary" })} mt-4`}
        >
          Limpar busca
        </Link>
      ) : filter === "todos" ? (
        <Link
          href="/nova"
          className={`${buttonClass({ variant: "secondary" })} mt-4`}
        >
          <IconPlus size={18} />
          Anotar primeira nota
        </Link>
      ) : (
        <Link
          href={filterHref("todos", "")}
          className={`${buttonClass({ variant: "secondary" })} mt-4`}
        >
          Ver todas
        </Link>
      )}
    </div>
  );
}
