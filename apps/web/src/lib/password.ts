/**
 * Política de senha do app, compartilhada entre o formulário (cliente) e as
 * Server Actions que criam e redefinem acesso (servidor) — uma regra só.
 *
 * Base: NIST 800-63B. Comprimento é o que protege; exigir maiúscula, dígito e
 * símbolo empurra a equipe para "Senha123!" repetida sem ganho real de
 * entropia. No lugar da composição, bloqueamos o que a pessoa de fato digita:
 * o próprio celular, o nome dela, o nome do bar, sequências e as senhas mais
 * comuns em português.
 *
 * A senha nunca é normalizada (trim/NFC): o que o dono digita é o que o
 * GoTrue recebe. Espaço nas pontas é recusado com mensagem própria, porque
 * seria invisível na hora de entregar.
 */

export const PASSWORD_MIN_LENGTH = 8;

/** O bcrypt do Supabase Auth só considera os primeiros 72 **bytes**. */
export const PASSWORD_MAX_BYTES = 72;

export interface PasswordContext {
  /** Celular de acesso, só dígitos com DDD (sem +55). */
  phone?: string | null;
  /** Nome de quem vai usar o app. */
  displayName?: string | null;
  /** Nome do bar, para pegar "bardosantos2026". */
  orgName?: string | null;
}

/**
 * Senhas que aparecem em qualquer lista de vazamento, mais os clássicos de
 * balcão. Comparadas sem dígitos no fim ("senha1234" → "senha").
 */
const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "87654321",
  "password",
  "senha",
  "admin",
  "brasil",
  "bemvindo",
  "whatsapp",
  "celular",
  "familia",
  "flamengo",
  "corinthians",
  "palmeiras",
  "saopaulo",
  "botafogo",
  "cruzeiro",
  "cerveja",
  "chopp",
  "cachaca",
  "caipirinha",
  "gela",
]);

const SEQUENCES = [
  "0123456789",
  "9876543210",
  "abcdefghijklmnopqrstuvwxyz",
  "zyxwvutsrqponmlkjihgfedcba",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
];

/** Minúsculas, sem acento e sem pontuação — só para comparar, nunca para gravar. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function tokens(value: string | null | undefined, minLength: number): string[] {
  if (!value) return [];
  return value
    .split(/\s+/)
    .map(fold)
    .filter((token) => token.length >= minLength);
}

/**
 * Devolve a mensagem do primeiro problema encontrado, ou `null` se a senha
 * passa. `context` deixa a regra mais dura: celular, nome e nome do bar.
 */
export function passwordProblem(
  value: string,
  context: PasswordContext = {},
): string | null {
  if (value !== value.trim()) {
    return "A senha não pode começar nem terminar com espaço.";
  }

  if (value.length < PASSWORD_MIN_LENGTH) {
    return `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }

  if (byteLength(value) > PASSWORD_MAX_BYTES) {
    return `A senha pode ter no máximo ${PASSWORD_MAX_BYTES} caracteres.`;
  }

  const folded = fold(value);

  if (new Set(folded).size === 1) {
    return "A senha não pode ser o mesmo caractere repetido.";
  }

  const withoutTrailingDigits = folded.replace(/\d+$/, "");
  if (
    COMMON_PASSWORDS.has(folded) ||
    (withoutTrailingDigits.length >= 4 && COMMON_PASSWORDS.has(withoutTrailingDigits))
  ) {
    return "Essa senha é comum demais. Escolha outra.";
  }

  if (folded.length >= 6 && SEQUENCES.some((sequence) => sequence.includes(folded))) {
    return "Evite sequências como 12345678 ou abcdefgh.";
  }

  const phoneDigits = (context.phone ?? "").replace(/\D/g, "");
  if (phoneDigits.length >= 8) {
    const tail = phoneDigits.slice(-8);
    if (folded.includes(tail)) {
      return "Evite o próprio celular na senha.";
    }
  }

  if (tokens(context.displayName, 3).some((token) => folded.includes(token))) {
    return "Evite o nome de quem vai usar a senha.";
  }

  if (tokens(context.orgName, 4).some((token) => folded.includes(token))) {
    return "Evite o nome do bar na senha.";
  }

  return null;
}
