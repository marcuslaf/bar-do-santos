"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSession } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, OrderItemInput } from "@/lib/types";

const MAX_MONEY_CENTS = 100_000_00;

const moneySchema = z
  .number()
  .int("Valor inválido.")
  .min(0, "Valor não pode ser negativo.")
  .max(MAX_MONEY_CENTS, "Valor acima do limite permitido.");

/*
 * Item de nota na captura. `baião_option` é o nome literal da coluna (o acento
 * faz parte do identificador), por isso a chave entre aspas no insert.
 */
const itemSchema = z.object({
  itemName: z
    .string()
    .trim()
    .min(1, "Informe o item.")
    .max(80, "Item muito longo (máx. 80)."),
  dishTagId: z.string().uuid("Tag inválida.").nullable().optional(),
  baiãoOption: z.enum(["com", "sem"]).nullable().optional(),
  unitPriceCents: moneySchema,
  funcionario: z.string().trim().max(80, "Nome do funcionário muito longo (máx. 80).").nullable().optional(),
});

const createSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Informe o nome do cliente.")
    .max(80, "Nome muito longo (máx. 80)."),
  description: z
    .string()
    .trim()
    .max(2000, "Observações muito longas (máx. 2000).")
    .optional()
    .default(""),
  totalCents: moneySchema.nullable().optional(),
  items: z.array(itemSchema).optional(),
});

const updateSchema = z.object({
  customerName: z.string().trim().min(1, "Informe o nome do cliente.").max(80),
  description: z
    .string()
    .trim()
    .max(2000, "Observações muito longas (máx. 2000).")
    .optional()
    .default(""),
  totalCents: moneySchema.nullable(),
});

const paySchema = z.object({
  totalCents: moneySchema,
  method: z.enum(["dinheiro", "pix", "credito", "debito", "outro"]),
});

const cancelSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Descreva o motivo do cancelamento.")
    .max(300, "Motivo muito longo."),
});

function failure(message: string): ActionResult<never> {
  return { ok: false, error: message };
}

function dbFailure(error: { code?: string; message: string }): ActionResult<never> {
  if (error.code === "42501") {
    return failure("Você não tem permissão para esta ação.");
  }
  if (error.code === "P0001") {
    return failure(error.message);
  }
  if (error.code === "23514") {
    return failure("Dados inválidos para esta nota.");
  }
  return failure("Não foi possível salvar. Tente novamente.");
}

function refresh(id?: string) {
  revalidatePath("/");
  revalidatePath("/caixa");
  if (id) revalidatePath(`/nota/${id}`);
}

export async function createOrder(input: {
  customerName: string;
  description: string;
  totalCents?: number | null;
  items?: OrderItemInput[];
}): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return failure("Sessão expirada. Entre novamente.");

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  // Com itens, o total é a soma deles: o valor digitado à mão deixa de valer
  // (só continua como fallback na captura antiga, sem itens).
  const items = parsed.data.items ?? [];
  const totalCents =
    items.length > 0
      ? items.reduce((sum, item) => sum + item.unitPriceCents, 0)
      : parsed.data.totalCents ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_name: parsed.data.customerName,
      description: parsed.data.description || null,
      total_cents: totalCents,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return dbFailure(error);

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: data.id,
        item_name: item.itemName,
        dish_tag_id: item.dishTagId ?? null,
        "baião_option": item.baiãoOption ?? null,
        unit_price_cents: item.unitPriceCents,
        funcionario: item.funcionario ?? null,
      })),
    );

    // Nota sem os itens que o total cobra seria pior que nota nenhuma: desfaz o
    // insert pelo admin, já que `orders` não tem policy de DELETE.
    if (itemsError) {
      await createAdminClient().from("orders").delete().eq("id", data.id);
      return dbFailure(itemsError);
    }
  }

  refresh(data.id);
  return { ok: true, data: { id: data.id } };
}

export async function updateOrder(
  id: string,
  input: { customerName: string; description: string; totalCents: number | null },
): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({
      customer_name: parsed.data.customerName,
      description: parsed.data.description || null,
      total_cents: parsed.data.totalCents,
    })
    .eq("id", id);

  if (error) return dbFailure(error);

  refresh(id);
  return { ok: true };
}

export async function deliverOrder(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "entregue" })
    .eq("id", id);

  if (error) return dbFailure(error);

  refresh(id);
  return { ok: true };
}

export async function payOrder(
  id: string,
  input: { totalCents: number; method: "dinheiro" | "pix" | "credito" | "debito" | "outro" },
): Promise<ActionResult> {
  const parsed = paySchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({
      status: "pago",
      total_cents: parsed.data.totalCents,
      payment_method: parsed.data.method,
    })
    .eq("id", id);

  if (error) return dbFailure(error);

  refresh(id);
  return { ok: true };
}

export async function cancelOrder(id: string, reason: string): Promise<ActionResult> {
  const parsed = cancelSchema.safeParse({ reason });
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Motivo inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelado", cancel_reason: parsed.data.reason })
    .eq("id", id);

  if (error) return dbFailure(error);

  refresh(id);
  return { ok: true };
}

export async function deleteOrder(id: string): Promise<ActionResult> {
  if (!id) return failure("Pedido inválido");

  const session = await getSession();
  if (!session) return failure("Sessão expirada. Entre novamente.");
  if (session.role !== "owner") {
    return failure("Somente o dono pode excluir notas.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("orders").delete().eq("id", id);

  if (error) {
    console.error("[deleteOrder] erro ao excluir:", error);
    return failure(`Falha ao excluir: ${error.message}`);
  }

  refresh(id);
  return { ok: true };
}
