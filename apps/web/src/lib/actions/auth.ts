"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSession } from "@/lib/data";
import { normalizePhone, phoneToAuthEmail } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, MemberRole } from "@/lib/types";

const INVALID_PHONE = "Informe um celular válido com DDD.";

const credentialsSchema = z.object({
  phone: z.string().trim().min(1, "Informe o celular."),
  password: z.string().min(1, "Informe a senha."),
});

const inviteSchema = z.object({
  phone: z.string().trim().min(1, "Informe o celular."),
  displayName: z
    .string()
    .trim()
    .min(2, "Informe o nome de quem vai usar o app.")
    .max(60, "Nome muito longo."),
  role: z.enum(["owner", "staff"]),
});

function failure(message: string): ActionResult<never> {
  return { ok: false, error: message };
}

function newTempPassword(): string {
  return randomBytes(9).toString("base64url");
}

export async function signIn(input: {
  phone: string;
  password: string;
}): Promise<ActionResult> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const digits = normalizePhone(parsed.data.phone);
  if (!digits) return failure(INVALID_PHONE);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: phoneToAuthEmail(digits),
    password: parsed.data.password,
  });

  if (error) {
    return failure("Celular ou senha incorretos.");
  }

  return { ok: true };
}

export async function signOut(): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function inviteMember(input: {
  phone: string;
  displayName: string;
  role: MemberRole;
}): Promise<ActionResult<{ tempPassword: string }>> {
  const session = await getSession();
  if (!session) return failure("Sessão expirada. Entre novamente.");
  if (session.role !== "owner") {
    return failure("Somente o dono pode criar acessos.");
  }

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const digits = normalizePhone(parsed.data.phone);
  if (!digits) return failure(INVALID_PHONE);

  const admin = createAdminClient();
  const tempPassword = newTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: phoneToAuthEmail(digits),
    password: tempPassword,
    email_confirm: true,
    user_metadata: { display_name: parsed.data.displayName },
  });

  // Caminho normal: usuário novo no Auth.
  if (!createError && created.user) {
    const { error: memberError } = await admin.from("org_members").insert({
      org_id: session.orgId,
      user_id: created.user.id,
      display_name: parsed.data.displayName,
      role: parsed.data.role,
      phone: digits,
    });

    if (memberError) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
      return failure("Não foi possível vincular o acesso ao bar.");
    }

    revalidatePath("/equipe");
    return { ok: true, data: { tempPassword } };
  }

  const duplicated =
    createError?.status === 422 ||
    /already|registered|exists/i.test(createError?.message ?? "");

  if (!duplicated) {
    return failure(
      "Não foi possível criar o acesso. Verifique a chave de serviço no servidor.",
    );
  }

  // A conta já existe no Auth. O celular é a chave lógica: procuramos o vínculo
  // em `org_members` para decidir entre reconvite (reativação) e recusa.
  const { data: rows, error: lookupError } = await admin
    .from("org_members")
    .select("id, user_id, org_id, active")
    .eq("phone", digits);

  if (lookupError) {
    return failure(
      "Não foi possível criar o acesso. Verifique a chave de serviço no servidor.",
    );
  }

  const memberships = (rows ?? []) as Array<{
    id: string;
    user_id: string;
    org_id: string;
    active: boolean;
  }>;

  // Sem vínculo por celular: pode ser alguém excluído da equipe (o vínculo é
  // apagado, mas a conta do Auth fica por causa do histórico de notas). O
  // e-mail sintético derivado do celular é a única ponte até essa conta.
  if (memberships.length === 0) {
    const { data: usersPage, error: usersError } =
      await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (usersError) {
      return failure(
        "Não foi possível criar o acesso. Verifique a chave de serviço no servidor.",
      );
    }

    const authEmail = phoneToAuthEmail(digits);
    const existingUser = (usersPage?.users ?? []).find(
      (user) => user.email?.toLowerCase() === authEmail,
    );

    if (!existingUser) {
      return failure("Já existe uma conta com este celular.");
    }

    const { data: userRows, error: userLookupError } = await admin
      .from("org_members")
      .select("id, org_id, active")
      .eq("user_id", existingUser.id);

    if (userLookupError) {
      return failure(
        "Não foi possível criar o acesso. Verifique a chave de serviço no servidor.",
      );
    }

    const userMemberships = (userRows ?? []) as Array<{
      id: string;
      org_id: string;
      active: boolean;
    }>;

    if (
      userMemberships.some(
        (row) => row.active && row.org_id === session.orgId,
      )
    ) {
      return failure("Este celular já tem acesso ativo à equipe.");
    }

    // Nunca resetar senha de quem tem vínculo ativo em outro bar.
    if (userMemberships.some((row) => row.active)) {
      return failure("Este celular já está em uso.");
    }

    const { error: passwordError } = await admin.auth.admin.updateUserById(
      existingUser.id,
      { password: tempPassword },
    );

    if (passwordError) {
      return failure(
        "Não foi possível criar o acesso. Verifique a chave de serviço no servidor.",
      );
    }

    // Vínculo legado (inativo, mesmo usuário neste bar): reativa em vez de
    // inserir, para não colidir com `org_members_org_user_key`.
    const legacyMembership = userMemberships.find(
      (row) => row.org_id === session.orgId,
    );

    const { error: linkError } = legacyMembership
      ? await admin
          .from("org_members")
          .update({
            display_name: parsed.data.displayName,
            role: parsed.data.role,
            phone: digits,
            active: true,
          })
          .eq("id", legacyMembership.id)
      : await admin.from("org_members").insert({
          org_id: session.orgId,
          user_id: existingUser.id,
          display_name: parsed.data.displayName,
          role: parsed.data.role,
          phone: digits,
          active: true,
        });

    if (linkError) {
      return failure("Não foi possível vincular o acesso ao bar.");
    }

    revalidatePath("/equipe");
    return { ok: true, data: { tempPassword } };
  }

  const currentOrgMember = memberships.find((row) => row.org_id === session.orgId);

  if (currentOrgMember?.active) {
    return failure("Este celular já tem acesso ativo à equipe.");
  }

  // Nunca resetar senha de quem tem vínculo ativo em outro bar.
  if (memberships.some((row) => row.active)) {
    return failure("Este celular já está em uso.");
  }

  // Vínculo só inativo em outra org: não é reconvite deste bar.
  if (!currentOrgMember) {
    return failure("Já existe uma conta com este celular.");
  }

  // Reconvite legítimo: vínculo inativo nesta org. Nova senha temporária no
  // mesmo usuário do Auth (o e-mail sintético é o mesmo derivado do celular).
  const { error: passwordError } = await admin.auth.admin.updateUserById(
    currentOrgMember.user_id,
    { password: tempPassword },
  );

  if (passwordError) {
    return failure(
      "Não foi possível criar o acesso. Verifique a chave de serviço no servidor.",
    );
  }

  const { error: memberError } = await admin
    .from("org_members")
    .update({
      display_name: parsed.data.displayName,
      role: parsed.data.role,
      active: true,
    })
    .eq("id", currentOrgMember.id);

  if (memberError) {
    return failure("Não foi possível vincular o acesso ao bar.");
  }

  revalidatePath("/equipe");
  return { ok: true, data: { tempPassword } };
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return failure("Sessão expirada. Entre novamente.");
  if (session.role !== "owner") {
    return failure("Somente o dono pode excluir acessos.");
  }

  const admin = createAdminClient();
  const { data: target, error: readError } = await admin
    .from("org_members")
    .select("id, user_id, org_id")
    .eq("id", memberId)
    .maybeSingle<{ id: string; user_id: string; org_id: string }>();

  if (readError || !target || target.org_id !== session.orgId) {
    return failure("Acesso não encontrado.");
  }

  if (target.user_id === session.userId) {
    return failure("Você não pode excluir o seu próprio acesso.");
  }

  // Excluir = apagar só o vínculo. A conta do Auth fica: `orders.created_by`
  // referencia auth.users sem ON DELETE e o histórico precisa do autor.
  const { error } = await admin
    .from("org_members")
    .delete()
    .eq("id", memberId);

  if (error) return failure("Não foi possível excluir o acesso.");

  revalidatePath("/equipe");
  return { ok: true };
}
