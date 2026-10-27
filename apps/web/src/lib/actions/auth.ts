"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSession } from "@/lib/data";
import { passwordProblem } from "@/lib/password";
import { normalizePhone, phoneToAuthEmail } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, MemberRole } from "@/lib/types";

const INVALID_PHONE = "Informe um celular válido com DDD.";

const credentialsSchema = z.object({
  phone: z.string().trim().min(1, "Informe o celular."),
  password: z.string().min(1, "Informe a senha."),
});

/**
 * Schema do convite. É uma fábrica porque a política de senha depende do nome
 * do bar — e ela precisa ver o `phone`/`displayName` já no mesmo objeto para
 * recusar "celular na senha" e "nome na senha".
 */
function inviteSchema(orgName: string) {
  return z
    .object({
      phone: z.string().trim().min(1, "Informe o celular."),
      displayName: z
        .string()
        .trim()
        .min(2, "Informe o nome de quem vai usar o app.")
        .max(60, "Nome muito longo."),
      role: z.enum(["owner", "staff"]),
      password: z.string().min(1, "Informe a senha."),
    })
    .superRefine((data, ctx) => {
      // A regra completa (comprimento, bytes, previsibilidade) vive em
      // `lib/password.ts`: o formulário aplica a mesma antes de enviar.
      const problem = passwordProblem(data.password, {
        phone: normalizePhone(data.phone),
        displayName: data.displayName,
        orgName,
      });

      if (problem) {
        ctx.addIssue({ code: "custom", path: ["password"], message: problem });
      }
    });
}

/** Traduz a recusa do GoTrue sem repassar `error.message` cru para a tela. */
function passwordPolicyFailure(message: string | undefined): ActionResult<never> | null {
  if (!message) return null;
  if (/weak|password|pwned|leaked/i.test(message)) {
    return failure("A senha não atende à política do servidor. Tente outra.");
  }
  return null;
}

function failure(message: string): ActionResult<never> {
  return { ok: false, error: message };
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
  password: string;
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return failure("Sessão expirada. Entre novamente.");
  if (session.role !== "owner") {
    return failure("Somente o dono pode criar acessos.");
  }

  const parsed = inviteSchema(session.orgName).safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const digits = normalizePhone(parsed.data.phone);
  if (!digits) return failure(INVALID_PHONE);

  const admin = createAdminClient();
  const password = parsed.data.password;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: phoneToAuthEmail(digits),
    password,
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
    return { ok: true };
  }

  // Antes de qualquer dedução de "celular já existe": o GoTrue também responde
  // 422 para senha fraca, e isso não pode ser confundido com conta duplicada.
  const policyFailure = passwordPolicyFailure(createError?.message);
  if (policyFailure) return policyFailure;

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
      { password },
    );

    if (passwordError) {
      return (
        passwordPolicyFailure(passwordError.message) ??
        failure(
          "Não foi possível criar o acesso. Verifique a chave de serviço no servidor.",
        )
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
    return { ok: true };
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

  // Reconvite legítimo: vínculo inativo nesta org. A senha digitada pelo dono
  // substitui a anterior no mesmo usuário do Auth (o e-mail sintético é o mesmo
  // derivado do celular) — é também o caminho de "esqueci/redefinir a senha":
  // excluir o vínculo e criar de novo devolve o acesso com senha nova.
  const { error: passwordError } = await admin.auth.admin.updateUserById(
    currentOrgMember.user_id,
    { password },
  );

  if (passwordError) {
    return (
      passwordPolicyFailure(passwordError.message) ??
      failure(
        "Não foi possível criar o acesso. Verifique a chave de serviço no servidor.",
      )
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
  return { ok: true };
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

/**
 * Redefine a senha de um membro ativo deste bar (só o dono). Existe porque a
 * senha agora é digitada por ele: sem isso, corrigir um erro de digitação
 * exigiria excluir o vínculo — caminho destrutivo que ainda passa pelo
 * fallback de contas órfãs.
 *
 * Efeito colateral medido em 2026-10-27: `admin.updateUserById({ password })`
 * revoga os refresh tokens do alvo. Quem estava logado cai em /login no próximo
 * carregamento — inclusive o dono, quando troca a própria senha. Aqui isso é o
 * desejado (senha nova encerra sessões antigas), mas não é corte de acesso: o
 * vínculo continua ativo e a pessoa entra de novo com a senha nova. Cortar
 * acesso é remover o vínculo, que é o que a RLS respeita.
 */
export async function resetMemberPassword(input: {
  memberId: string;
  password: string;
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return failure("Sessão expirada. Entre novamente.");
  if (session.role !== "owner") {
    return failure("Somente o dono pode redefinir senhas.");
  }

  const parsed = z
    .object({ memberId: z.string().uuid(), password: z.string().min(1, "Informe a senha.") })
    .safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const admin = createAdminClient();

  // `org_id` no filtro, não só `id`: um dono não alcança membro de outro bar.
  const { data: target, error: readError } = await admin
    .from("org_members")
    .select("id, user_id, org_id, active, display_name, phone")
    .eq("id", parsed.data.memberId)
    .eq("org_id", session.orgId)
    .maybeSingle<{
      id: string;
      user_id: string;
      org_id: string;
      active: boolean;
      display_name: string;
      phone: string | null;
    }>();

  if (readError) {
    return failure(
      "Não foi possível redefinir a senha. Verifique a chave de serviço no servidor.",
    );
  }

  if (!target) return failure("Acesso não encontrado.");

  if (!target.active) {
    return failure(
      "Este acesso está inativo. Crie o acesso de novo, com a senha nova.",
    );
  }

  const problem = passwordProblem(parsed.data.password, {
    phone: target.phone,
    displayName: target.display_name,
    orgName: session.orgName,
  });

  if (problem) return failure(problem);

  // Mesmo invariante do convite: nunca trocar a senha de quem tem vínculo
  // ativo em outro bar.
  const { data: otherRows, error: otherError } = await admin
    .from("org_members")
    .select("id, org_id, active")
    .eq("user_id", target.user_id)
    .neq("org_id", session.orgId);

  if (otherError) {
    return failure(
      "Não foi possível redefinir a senha. Verifique a chave de serviço no servidor.",
    );
  }

  if ((otherRows ?? []).some((row) => row.active)) {
    return failure("Este celular já está em uso em outro bar.");
  }

  const { error } = await admin.auth.admin.updateUserById(target.user_id, {
    password: parsed.data.password,
  });

  if (error) {
    return (
      passwordPolicyFailure(error.message) ??
      failure(
        "Não foi possível redefinir a senha. Verifique a chave de serviço no servidor.",
      )
    );
  }

  // Trilha mínima de auditoria: só identificadores, nunca a senha. Não existe
  // tabela de auditoria de acesso no v1 — isto é rastro de depuração, não
  // registro de compliance.
  console.info(
    JSON.stringify({
      event: "member.password_reset",
      orgId: session.orgId,
      memberId: target.id,
      actorId: session.userId,
    }),
  );

  revalidatePath("/equipe");
  return { ok: true };
}
