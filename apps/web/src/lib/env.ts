export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL não configurada. Copie .env.example para apps/web/.env.local.",
    );
  }
  return value;
}

export function supabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada. Copie .env.example para apps/web/.env.local.",
    );
  }
  return value;
}

export function supabaseServiceRoleKey(): string {
  // 2026: Supabase emite chaves no formato novo (sb_secret_…); o nome legado
  // continua aceito para não quebrar ambientes ainda não migrados.
  const value =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!value) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY) não configurada no servidor. Nunca use o prefixo NEXT_PUBLIC_ nesta chave.",
    );
  }
  return value;
}
