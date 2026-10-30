"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSession } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, BaiãoOption } from "@/lib/types";

const MAX_ITEM_CENTS = 10_000_000;

/*
 * A coluna chama-se literalmente `baião_option` (migration 20261030000000): o
 * acento faz parte do identificador no Postgres, então a chave vai entre aspas
 * em todo insert/update.
 */
const itemSchema = z.object({
  itemName: z
    .string()
    .trim()
    .min(1, "Informe o item.")
    .max(80, "Item muito longo (máx. 80)."),
  dishTagId: z.string().uuid("Tag inválida.").nullable().optional(),
  baiãoOption: z.enum(["com", "sem"]).nullable().optional(),
  unitPriceCents: z
    .number()
    .int("Valor inválido.")
    .min(0, "Valor não pode ser negativo.")
    .max(MAX_ITEM_CENTS, "Valor acima do limite permitido."),
});

const createSchema = itemSchema.extend({
  orderId: z.string().uuid("Pedido inválido."),
});

const updateSchema = itemSchema.extend({
  id: z.string().uuid("Item inválido."),
});

const deleteSchema = z.object({ id: z.string().uuid("Item inválido.") });

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
  if (error.code === "23503") {
    return failure("Tag ou nota inválida.");
  }
  if (error.code === "23514") {
    return failure("Dados inválidos para este item.");
  }
  return failure("Não foi possível salvar o item. Tente novamente.");
}

function refresh(orderId?: string) {
  revalidatePath("/");
  revalidatePath("/caixa");
  if (orderId) revalidatePath(`/nota/${orderId}`);
}

export async function createOrderItem(input: {
  orderId: string;
  itemName: string;
  dishTagId?: string | null;
  baiãoOption?: BaiãoOption | null;
  unitPriceCents: number;
}): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return failure("Sessão expirada. Entre novamente.");

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  // Client anon: a RLS de `order_items` confere se a nota é da org do usuário.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_items")
    .insert({
      order_id: parsed.data.orderId,
      item_name: parsed.data.itemName,
      dish_tag_id: parsed.data.dishTagId ?? null,
      "baião_option": parsed.data.baiãoOption ?? null,
      unit_price_cents: parsed.data.unitPriceCents,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return dbFailure(error);

  refresh(parsed.data.orderId);
  return { ok: true, data: { id: data.id } };
}

export async function updateOrderItem(input: {
  id: string;
  itemName: string;
  dishTagId?: string | null;
  baiãoOption?: BaiãoOption | null;
  unitPriceCents: number;
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return failure("Sessão expirada. Entre novamente.");

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_items")
    .update({
      item_name: parsed.data.itemName,
      dish_tag_id: parsed.data.dishTagId ?? null,
      "baião_option": parsed.data.baiãoOption ?? null,
      unit_price_cents: parsed.data.unitPriceCents,
    })
    .eq("id", parsed.data.id)
    .select("order_id")
    .maybeSingle<{ order_id: string }>();

  if (error) return dbFailure(error);
  if (!data) return failure("Item não encontrado.");

  refresh(data.order_id);
  return { ok: true };
}

export async function deleteOrderItem(input: { id: string }): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return failure("Sessão expirada. Entre novamente.");

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_items")
    .delete()
    .eq("id", parsed.data.id)
    .select("order_id")
    .maybeSingle<{ order_id: string }>();

  if (error) return dbFailure(error);
  if (!data) return failure("Item não encontrado.");

  refresh(data.order_id);
  return { ok: true };
}
