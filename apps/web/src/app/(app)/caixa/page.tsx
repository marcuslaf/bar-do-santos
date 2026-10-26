import type { Metadata } from "next";
import Link from "next/link";

import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { summarizeCash } from "@/lib/cash";
import { getBusinessDay, getOrdersByDay, getSession } from "@/lib/data";
import { formatCents, formatDate, formatTime } from "@/lib/format";
import {
  PAYMENT_METHOD_LABEL,
  type Order,
  type PaymentMethod,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Caixa",
};

const METHODS: PaymentMethod[] = [
  "dinheiro",
  "pix",
  "credito",
  "debito",
  "outro",
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function shiftDay(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const shifted = new Date(
    Date.UTC(year ?? 1970, (month ?? 1) - 1, (date ?? 1) + delta),
  );
  return shifted.toISOString().slice(0, 10);
}

function isValidDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default async function CashPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawDay = Array.isArray(params.dia) ? params.dia[0] : params.dia;

  const session = await getSession();
  if (!session) return null;

  const today = await getBusinessDay();
  const day = rawDay && isValidDay(rawDay) ? rawDay : today;

  const orders = await getOrdersByDay(day);
  const totals = summarizeCash(orders);

  const paid = orders.filter((order) => order.status === "pago");
  const canceled = orders.filter((order) => order.status === "cancelado");

  const previousDay = shiftDay(day, -1);
  const nextDay = shiftDay(day, 1);
  const canGoNext = nextDay <= today;
  const isToday = day === today;

  return (
    <div>
      <h1 className="font-display text-[27px] leading-tight text-ink">Caixa</h1>
      <p className="mt-1.5 text-[13px] text-ink-soft">
        Fechamento do dia operacional
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-surface p-1.5 md:max-w-sm">
        <Link
          href={`/caixa?dia=${previousDay}`}
          aria-label="Dia anterior"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <IconChevronLeft size={22} />
        </Link>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-display text-[17px] leading-tight text-ink">
            <span className="capitalize">{formatDate(day, session.timezone)}</span>
          </p>
          {isToday ? (
            <p className="text-[12px] leading-tight text-ink-soft">Hoje</p>
          ) : null}
        </div>

        {canGoNext ? (
          <Link
            href={`/caixa?dia=${nextDay}`}
            aria-label="Dia seguinte"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <IconChevronRight size={22} />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            aria-label="Dia seguinte indisponível"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-line-strong"
          >
            <IconChevronRight size={22} />
          </span>
        )}
      </div>

      {!isToday ? (
        <Link
          href="/caixa"
          className="mt-2 inline-flex min-h-11 items-center text-[13px] font-medium text-brand-ink underline underline-offset-2"
        >
          Voltar para hoje
        </Link>
      ) : null}

      <p className="mt-3 text-[13px] text-ink-soft">
        {orders.length === 0
          ? "Nenhuma nota registrada neste dia."
          : `${orders.length} ${orders.length === 1 ? "nota" : "notas"} no dia`}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="col-span-2 rounded-2xl border border-brand/25 bg-brand-soft p-4 md:col-span-1">
          <p className="text-[12px] font-semibold tracking-[0.09em] text-brand-ink uppercase">
            Total recebido
          </p>
          <p className="tabular mt-1 font-display text-[30px] leading-none text-brand-ink">
            {formatCents(totals.paidTotalCents)}
          </p>
          <p className="mt-1.5 text-[13px] text-brand-ink">
            {totals.paidCount}{" "}
            {totals.paidCount === 1 ? "nota paga" : "notas pagas"}
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-[12px] font-semibold tracking-[0.09em] text-ink-soft uppercase">
            Em aberto
          </p>
          <p className="tabular mt-1 text-[20px] leading-tight font-semibold text-ink">
            {formatCents(totals.openTotalCents)}
          </p>
          <p className="mt-1.5 text-[12px] text-ink-soft">
            {totals.openCount} {totals.openCount === 1 ? "nota" : "notas"}
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-[12px] font-semibold tracking-[0.09em] text-ink-soft uppercase">
            Canceladas
          </p>
          <p className="tabular mt-1 text-[20px] leading-tight font-semibold text-ink">
            {totals.canceledCount}
          </p>
          <p className="mt-1.5 text-[12px] text-ink-soft">
            {totals.canceledCount === 1 ? "nota no dia" : "notas no dia"}
          </p>
        </div>
      </div>

      {/*
       * No desktop os quatro blocos viram duas colunas — a largura sobra e a
       * leitura fica mais curta. No celular continuam empilhados.
       */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 md:items-start">
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-display text-[19px] text-ink">
            Por forma de pagamento
          </h2>

          {totals.paidCount === 0 ? (
            <p className="mt-2 text-[14px] text-ink-soft">
              Nenhum pagamento registrado neste dia.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {METHODS.map((method) => {
                const total = totals.byMethod[method];
                const share =
                  totals.paidTotalCents > 0 ? total / totals.paidTotalCents : 0;

                return (
                  <li key={method}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[15px] text-ink">
                        {PAYMENT_METHOD_LABEL[method]}
                      </span>
                      <span className="tabular text-[15px] font-medium text-ink">
                        {formatCents(total)}
                      </span>
                    </div>
                    <div
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2"
                    >
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.round(share * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-display text-[19px] text-ink">Por quem anotou</h2>

          {totals.byAuthor.length === 0 ? (
            <p className="mt-2 text-[14px] text-ink-soft">
              Sem notas pagas para dividir por autor.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {totals.byAuthor.map((author) => (
                <li
                  key={author.authorName}
                  className="flex items-baseline justify-between gap-3 py-2.5"
                >
                  <span className="min-w-0 truncate text-[15px] text-ink">
                    {author.authorName}
                    <span className="ml-1.5 text-[12px] text-ink-soft">
                      {author.count} {author.count === 1 ? "nota" : "notas"}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-[15px] font-medium text-ink">
                    {formatCents(author.totalCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-display text-[19px] text-ink">Notas pagas</h2>

          {paid.length === 0 ? (
            <p className="mt-2 text-[14px] text-ink-soft">
              Nenhuma nota paga neste dia.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-line">
              {paid.map((order) => (
                <PaidRow key={order.id} order={order} timeZone={session.timezone} />
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-display text-[19px] text-ink">Canceladas</h2>

          {canceled.length === 0 ? (
            <p className="mt-2 text-[14px] text-ink-soft">
              Nenhum cancelamento neste dia.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-line">
              {canceled.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/nota/${order.id}`}
                    className="-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium text-ink-soft">
                        {order.customer_name}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-ink-soft">
                        {formatTime(order.canceled_at ?? order.created_at, session.timezone)}
                        {order.cancel_reason ? ` · ${order.cancel_reason}` : ""}
                      </span>
                    </span>
                    <span className="tabular shrink-0 pt-0.5 text-[14px] text-ink-soft">
                      {formatCents(order.total_cents)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function PaidRow({ order, timeZone }: { order: Order; timeZone: string }) {
  return (
    <li>
      <Link
        href={`/nota/${order.id}`}
        className="-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-medium text-ink">
            {order.customer_name}
          </span>
          <span className="mt-0.5 block text-[12px] text-ink-soft">
            {formatTime(order.paid_at ?? order.created_at, timeZone)}
            {order.payment_method
              ? ` · ${PAYMENT_METHOD_LABEL[order.payment_method]}`
              : ""}
          </span>
        </span>
        <span className="tabular shrink-0 pt-0.5 text-[15px] font-semibold text-ink">
          {formatCents(order.total_cents)}
        </span>
      </Link>
    </li>
  );
}

