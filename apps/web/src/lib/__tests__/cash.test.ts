import { describe, expect, it } from "vitest";

import { summarizeCash } from "@/lib/cash";
import { parseCents } from "@/lib/format";
import type { Order } from "@/lib/types";

function order(overrides: Partial<Order>): Order {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    customer_name: "Cliente",
    description: "Pedido",
    status: "aberto",
    total_cents: null,
    payment_method: null,
    created_by: "user",
    created_at: "2026-10-26T20:00:00.000Z",
    day_key: "2026-10-26",
    delivered_at: null,
    paid_at: null,
    canceled_at: null,
    cancel_reason: null,
    author_name: "Ana",
    ...overrides,
  };
}

describe("summarizeCash", () => {
  it("separa pago, aberto e cancelado", () => {
    const totals = summarizeCash([
      order({ status: "pago", total_cents: 4550, payment_method: "pix" }),
      order({ status: "aberto", total_cents: 2000 }),
      order({ status: "cancelado", total_cents: 1000 }),
    ]);

    expect(totals.paidCount).toBe(1);
    expect(totals.paidTotalCents).toBe(4550);
    expect(totals.openCount).toBe(1);
    expect(totals.openTotalCents).toBe(2000);
    expect(totals.canceledCount).toBe(1);
  });

  it("agrupa o total pago por forma de pagamento", () => {
    const totals = summarizeCash([
      order({ status: "pago", total_cents: 1000, payment_method: "dinheiro" }),
      order({ status: "pago", total_cents: 2500, payment_method: "dinheiro" }),
      order({ status: "pago", total_cents: 7000, payment_method: "credito" }),
    ]);

    expect(totals.byMethod.dinheiro).toBe(3500);
    expect(totals.byMethod.credito).toBe(7000);
    expect(totals.byMethod.pix).toBe(0);
    expect(totals.paidTotalCents).toBe(10500);
  });

  it("agrupa por quem anotou e ordena do maior para o menor", () => {
    const totals = summarizeCash([
      order({ status: "pago", total_cents: 1000, author_name: "Ana" }),
      order({ status: "pago", total_cents: 500, author_name: "Ana" }),
      order({ status: "pago", total_cents: 3000, author_name: "Bruno" }),
    ]);

    expect(totals.byAuthor).toEqual([
      { authorName: "Bruno", count: 1, totalCents: 3000 },
      { authorName: "Ana", count: 2, totalCents: 1500 },
    ]);
  });

  it("ignora cancelado no total e trata nota sem valor como zero", () => {
    const totals = summarizeCash([
      order({ status: "pago", total_cents: null, payment_method: "pix" }),
      order({ status: "cancelado", total_cents: 9000 }),
    ]);

    expect(totals.paidTotalCents).toBe(0);
    expect(totals.byMethod.pix).toBe(0);
  });
});

describe("parseCents", () => {
  it("interpreta formato brasileiro", () => {
    expect(parseCents("45,50")).toBe(4550);
    expect(parseCents("1.234,56")).toBe(123456);
    expect(parseCents("R$ 12")).toBe(1200);
  });

  it("retorna null para vazio ou inválido", () => {
    expect(parseCents("")).toBeNull();
    expect(parseCents("abc")).toBeNull();
    expect(parseCents("-5")).toBeNull();
  });
});
