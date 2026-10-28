import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Member, Order, Session } from "@/lib/types";

interface MemberRow {
  role: "owner" | "staff";
  display_name: string;
  phone: string | null;
  org_id: string;
  orgs:
    | { name: string; timezone: string; day_cutoff_hour: number }
    | { name: string; timezone: string; day_cutoff_hour: number }[]
    | null;
}

function pickOrg(row: MemberRow) {
  return Array.isArray(row.orgs) ? (row.orgs[0] ?? null) : row.orgs;
}

/** Sessão do usuário logado + dados do restaurante. Deduplicada por request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("org_members")
    .select("role, display_name, phone, org_id, orgs(name, timezone, day_cutoff_hour)")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle<MemberRow>();

  if (error || !data) return null;

  const org = pickOrg(data);

  return {
    userId: user.id,
    displayName: data.display_name,
    role: data.role,
    orgId: data.org_id,
    orgName: org?.name ?? "Bar do Santos",
    phone: data.phone ?? null,
    timezone: org?.timezone ?? "America/Sao_Paulo",
    dayCutoffHour: org?.day_cutoff_hour ?? 4,
  };
});

/** Dia operacional corrente, calculado no banco (fuso + horário de corte). */
export const getBusinessDay = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_business_day");

  if (error || typeof data !== "string") {
    throw new Error(
      "Não foi possível determinar o dia operacional. Verifique as migrations.",
    );
  }

  return data;
});

function sanitizeTerm(term: string): string {
  return term.replace(/[%,()*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

/** Notas do dia operacional, mais recentes primeiro. */
export async function getDayOrders(term?: string): Promise<Order[]> {
  const supabase = await createClient();
  const day = await getBusinessDay();

  let query = supabase
    .from("orders_view")
    .select("*")
    .eq("day_key", day)
    .order("created_at", { ascending: false })
    .limit(300);

  const cleaned = term ? sanitizeTerm(term) : "";
  if (cleaned.length > 0) {
    query = query.or(
      `customer_name.ilike.%${cleaned}%,description.ilike.%${cleaned}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`Falha ao carregar as notas: ${error.message}`);

  return (data ?? []) as Order[];
}

export async function getOrder(id: string): Promise<Order | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders_view")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Falha ao carregar a nota: ${error.message}`);
  return (data as Order | null) ?? null;
}

/** Todas as notas de um dia (para fechamento de caixa). */
export async function getOrdersByDay(day: string): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders_view")
    .select("*")
    .eq("day_key", day)
    .order("created_at", { ascending: true })
    .limit(1000);

  if (error) throw new Error(`Falha ao carregar o caixa: ${error.message}`);
  return (data ?? []) as Order[];
}

export async function getMembers(): Promise<Member[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_members")
    .select("id, user_id, display_name, role, active, phone, created_at")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Falha ao carregar a equipe: ${error.message}`);
  return (data ?? []) as Member[];
}
