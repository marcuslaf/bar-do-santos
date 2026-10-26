export type OrderStatus = "aberto" | "entregue" | "pago" | "cancelado";

export type PaymentMethod = "dinheiro" | "pix" | "credito" | "debito" | "outro";

export type MemberRole = "owner" | "staff";

export interface Order {
  id: string;
  customer_name: string;
  description: string;
  status: OrderStatus;
  total_cents: number | null;
  payment_method: PaymentMethod | null;
  created_by: string;
  created_at: string;
  day_key: string;
  delivered_at: string | null;
  paid_at: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  author_name: string | null;
}

export interface Session {
  userId: string;
  displayName: string;
  role: MemberRole;
  orgId: string;
  orgName: string;
  timezone: string;
  dayCutoffHour: number;
}

export interface Member {
  id: string;
  user_id: string;
  display_name: string;
  role: MemberRole;
  active: boolean;
  phone: string | null;
  created_at: string;
}

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  aberto: "Aberto",
  entregue: "Entregue",
  pago: "Pago",
  cancelado: "Cancelado",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
  outro: "Outro",
};
