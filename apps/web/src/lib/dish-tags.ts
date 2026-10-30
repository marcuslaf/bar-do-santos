/**
 * Tipos locais das tabelas criadas em `dish_tags_and_order_items`.
 * Vivem aqui (e não em `lib/types`) para a UI de pratos/filtros não depender
 * do contrato de domínio de notas.
 */

/** Tag de prato do catálogo do bar (`public.dish_tags`). */
export interface DishTag {
  id: string;
  name: string;
}

/** Opção de baião de um item (`public.order_items.baião_option`). */
export type BaiaoOption = "com" | "sem";

/**
 * Item de nota como vem do banco. O nome da coluna do baião é acentuado no
 * schema, por isso a chave citada.
 */
export interface OrderItemRow {
  id: string;
  order_id: string;
  item_name: string;
  dish_tag_id: string | null;
  "baião_option": BaiaoOption | null;
  unit_price_cents: number;
  created_at: string;
}

export const BAIAO_OPTION_LABEL: Record<BaiaoOption, string> = {
  com: "Com baião",
  sem: "Sem baião",
};
