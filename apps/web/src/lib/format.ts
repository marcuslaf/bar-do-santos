const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const amount = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Espelha o check `orders_total_cents_check` do banco (R$ 100.000,00). */
export const MAX_AMOUNT_CENTS = 10_000_000;

export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return brl.format(cents / 100);
}

/** Valor sem o "R$", para dentro do campo mascarado. Vazio quando não há valor. */
export function formatAmount(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return amount.format(cents / 100);
}

/**
 * Máscara de moeda de PDV: cada dígito entra pela direita.
 * "3" → 3 (0,03) · "32" → 32 (0,32) · "325" → 325 (3,25) · "3250" → 3250 (32,50).
 * Ignora separadores e sinais — backspace simplesmente devolve menos dígitos.
 */
export function centsFromDigits(raw: string): number | null {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (digits === "") return null;

  const cents = Number.parseInt(digits, 10);
  return Number.isSafeInteger(cents) ? cents : null;
}

/**
 * Contingência para colar/completar. Se o texto traz separador decimal com até
 * duas casas ("32,50", "32.50", "R$ 1.234,56"), respeita os centavos via
 * `parseCents`; sem separador ("3250"), cai na máscara de dígitos.
 */
export function centsFromPastedText(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (/[,.]\d{1,2}$/.test(trimmed)) return parseCents(trimmed);
  return centsFromDigits(trimmed);
}

export function parseCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const normalized = trimmed
    .replace(/[^\d.,-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");

  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function formatDate(isoDate: string, timeZone: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12));
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone,
  }).format(date);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
