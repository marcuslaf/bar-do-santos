/**
 * Celular brasileiro como identidade de acesso.
 *
 * O Supabase Auth continua sendo e-mail + senha por baixo, mas o e-mail é
 * sintético e derivado do celular (`<digitos>@celular.local`). O usuário nunca
 * vê esse e-mail: digita celular + senha.
 */

/** Remove tudo que não é dígito. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normaliza para DDD + número (10 ou 11 dígitos, sem +55).
 * Devolve `null` quando o resultado não é um celular/telefone brasileiro válido.
 */
export function normalizePhone(value: string): string | null {
  let digits = digitsOnly(value);

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  return digits.length === 10 || digits.length === 11 ? digits : null;
}

/** Máscara de exibição: 11 dígitos viram `(11) 91234-5678`; 10 viram `(11) 1234-5678`. */
export function formatPhone(digits: string): string {
  const clean = digitsOnly(digits);

  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }

  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }

  return digits;
}

/** E-mail sintético usado pelo Supabase Auth. */
export function phoneToAuthEmail(digits: string): string {
  return `${digits}@celular.local`;
}

/**
 * Caminho inverso: e-mail sintético → celular formatado.
 * Qualquer domínio diferente de `celular.local` devolve `null`.
 */
export function phoneFromAuthEmail(email: string | null | undefined): string | null {
  if (!email) return null;

  const at = email.lastIndexOf("@");
  if (at <= 0) return null;

  const localPart = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();

  if (domain !== "celular.local") return null;

  return formatPhone(localPart);
}
