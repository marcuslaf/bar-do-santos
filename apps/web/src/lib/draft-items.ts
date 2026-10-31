"use client";

import type { OrderItemInput } from "@/lib/types";

const DRAFT_KEY = "pedidos:rascunho-itens";

export interface DraftItem {
  key: string;
  itemName: string;
  funcionario?: string;
  dishTagId?: string | null;
  baiãoOption?: "com" | "sem" | null;
  unitPriceCents: number;
  isDraft: true;
}

/** Salva itens de rascunho no localStorage */
export function saveDraftItems(items: DraftItem[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(items));
  } catch {
    // Ignora erro de storage
  }
}

/** Carrega itens de rascunho do localStorage */
export function loadDraftItems(): DraftItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      isDraft: true,
    })) as DraftItem[];
  } catch {
    return [];
  }
}

/** Limpa rascunho após salvar com sucesso */
export function clearDraftItems(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignora
  }
}

/** Adiciona um item ao rascunho */
export function addDraftItem(item: Omit<DraftItem, "key" | "isDraft">): DraftItem {
  const items = loadDraftItems();
  const key = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const newItem: DraftItem = { ...item, key, isDraft: true };
  saveDraftItems([...items, { ...item, key, isDraft: true }]);
  return { ...item, key, isDraft: true };
}

/** Remove um item do rascunho */
export function removeDraftItem(key: string): void {
  const items = loadDraftItems();
  saveDraftItems(items.filter((item) => item.key !== key));
}