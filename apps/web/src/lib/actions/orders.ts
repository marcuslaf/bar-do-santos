"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSession } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";

const MAX_MONEY_CENTS = 100_000_00;

const moneySchema = z
  .number()
  .int("Valor inválido.")
  .min(0, "Valor não pode ser negativo.")
  .max(MAX_MONEY_CENTS, "Valor acima do limite permitido.");

const createSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Informe o nome do cliente.")
    .max(80, "Nome muito longo (máx. 80)."),
  description: z
    .string()
    .trim()
    .min(1, "Escreva o pedido.")
    .max(2000, "Pedido muito longo (máx. 2000)."),
  totalCents: moneySchema.nullable().optional(),
});

const updateSchema = z.object({
  customerName: z.string().trim().min(1, "Informe o nome do cliente.").max(80),
  description: z.string().trim().min(1, "Escreva o pedido.").max(2000),
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
}): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return failure("Sessão expirada. Entre novamente.");

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_name: parsed.data.customerName,
      description: parsed.data.description,
      total_cents: parsed.data.totalCents ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return dbFailure(error);

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
      description: parsed.data.description,
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

  const supabase = createAdminClient();
  const { error } = await supabase.from("orders").delete().eq("id", id);

  if (error) return dbFailure(error);

  refresh(id);
  return { ok: true };
}
