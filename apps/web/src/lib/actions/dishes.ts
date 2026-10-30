"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSession } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";

const tagNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome da tag.")
  .max(60, "Nome muito longo (máx. 60).");

const createSchema = z.object({ name: tagNameSchema });

const updateSchema = z.object({
  id: z.string().uuid("Tag inválida."),
  name: tagNameSchema,
});

const deleteSchema = z.object({ id: z.string().uuid("Tag inválida.") });

function failure(message: string): ActionResult<never> {
  return { ok: false, error: message };
}

function dbFailure(error: { code?: string; message: string }): ActionResult<never> {
  if (error.code === "23505") return failure("Já existe uma tag com esse nome.");
  if (error.code === "23514") return failure("Nome de tag inválido.");
  if (error.code === "42501") {
    return failure("Você não tem permissão para esta ação.");
  }
  if (error.code === "P0001") return failure(error.message);
  return failure("Não foi possível salvar a tag. Tente novamente.");
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/nova");
  revalidatePath("/equipe");
}

export async function createDishTag(input: {
  name: string;
}): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return failure("Sessão expirada. Entre novamente.");
  if (session.role !== "owner") {
    return failure("Somente o dono pode fazer isso.");
  }

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  // `dish_tags` não tem trigger de `org_id`: com service role a RLS não entra,
  // então a org vem da sessão, nunca do cliente.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dish_tags")
    .insert({ org_id: session.orgId, name: parsed.data.name })
    .select("id")
    .single<{ id: string }>();

  if (error) return dbFailure(error);

  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function updateDishTag(input: {
  id: string;
  name: string;
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return failure("Sessão expirada. Entre novamente.");
  if (session.role !== "owner") {
    return failure("Somente o dono pode fazer isso.");
  }

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const admin = createAdminClient();
  // `org_id` no filtro, não só `id`: o service role ignora a RLS, e sem isso um
  // dono alcançaria tag de outro bar.
  const { data, error } = await admin
    .from("dish_tags")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id)
    .eq("org_id", session.orgId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) return dbFailure(error);
  if (!data) return failure("Tag não encontrada.");

  refresh();
  return { ok: true };
}

export async function deleteDishTag(input: { id: string }): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return failure("Sessão expirada. Entre novamente.");
  if (session.role !== "owner") {
    return failure("Somente o dono pode fazer isso.");
  }

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const admin = createAdminClient();

  // A FK de `order_items.dish_tag_id` é `on delete set null`: sem esta checagem
  // o DELETE passaria e apagaria o prato de notas já fechadas.
  const { count, error: usageError } = await admin
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("dish_tag_id", parsed.data.id);

  if (usageError) {
    return failure("Não foi possível excluir a tag. Tente novamente.");
  }

  if ((count ?? 0) > 0) {
    return failure("Não é possível excluir: esta tag está em uso em pedidos.");
  }

  const { data, error } = await admin
    .from("dish_tags")
    .delete()
    .eq("id", parsed.data.id)
    .eq("org_id", session.orgId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) return dbFailure(error);
  if (!data) return failure("Tag não encontrada.");

  refresh();
  return { ok: true };
}
