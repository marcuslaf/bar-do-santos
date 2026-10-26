import type { Order, PaymentMethod } from "@/lib/types";

export interface CashTotals {
  paidCount: number;
  paidTotalCents: number;
  openCount: number;
  openTotalCents: number;
  canceledCount: number;
  byMethod: Record<PaymentMethod, number>;
  byAuthor: Array<{ authorName: string; count: number; totalCents: number }>;
}

const EMPTY_BY_METHOD: Record<PaymentMethod, number> = {
  dinheiro: 0,
  pix: 0,
  credito: 0,
  debito: 0,
  outro: 0,
};

export function summarizeCash(orders: readonly Order[]): CashTotals {
  const byMethod: Record<PaymentMethod, number> = { ...EMPTY_BY_METHOD };
  const authorMap = new Map<string, { count: number; totalCents: number }>();

  let paidCount = 0;
  let paidTotalCents = 0;
  let openCount = 0;
  let openTotalCents = 0;
  let canceledCount = 0;

  for (const order of orders) {
    const value = order.total_cents ?? 0;

    if (order.status === "pago") {
      paidCount += 1;
      paidTotalCents += value;

      if (order.payment_method) {
        byMethod[order.payment_method] += value;
      }

      const name = order.author_name ?? "Sem nome";
      const current = authorMap.get(name) ?? { count: 0, totalCents: 0 };
      current.count += 1;
      current.totalCents += value;
      authorMap.set(name, current);
      continue;
    }

    if (order.status === "aberto" || order.status === "entregue") {
      openCount += 1;
      openTotalCents += value;
      continue;
    }

    canceledCount += 1;
  }

  const byAuthor = [...authorMap.entries()]
    .map(([authorName, values]) => ({ authorName, ...values }))
    .sort((a, b) => b.totalCents - a.totalCents);

  return {
    paidCount,
    paidTotalCents,
    openCount,
    openTotalCents,
    canceledCount,
    byMethod,
    byAuthor,
  };
}
