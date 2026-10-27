"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  IconAlert,
  IconCheckCircle,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconSpinner,
} from "@/components/ui/icons";
import { errorBoxClass, inputClass, labelClass } from "@/components/ui/styles";
import { inviteMember } from "@/lib/actions/auth";
import { PASSWORD_MIN_LENGTH, passwordProblem } from "@/lib/password";
import { digitsOnly, formatPhone, normalizePhone } from "@/lib/phone";
import type { MemberRole } from "@/lib/types";

/**
 * O acesso criado, guardado só em memória para o cartão de confirmação.
 * A senha sai do próprio state do formulário — o servidor não devolve mais
 * nada (e nunca vai para localStorage/sessionStorage: é senha em claro).
 */
interface CreatedAccess {
  displayName: string;
  phone: string;
  password: string;
}

export function InviteForm({ orgName }: { orgName: string }) {
  const router = useRouter();
  const errorId = useId();
  const passwordId = useId();
  const passwordHintId = useId();

  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  /*
   * Visível por padrão: o erro dominante aqui é typo numa senha mascarada que
   * ninguém confere. De quebra, ela aparece em claro no cartão de sucesso — o
   * dono precisa conferir o que vai entregar.
   */
  const [passwordVisible, setPasswordVisible] = useState(true);
  const [role, setRole] = useState<MemberRole>("staff");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [created, setCreated] = useState<CreatedAccess | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    // Validação na ordem em que o dono preenche: nome, celular, senha.
    const cleanName = displayName.trim();
    const cleanPhone = phone.trim();

    if (cleanName.length < 2) {
      setError("Informe o nome de quem vai usar o app.");
      return;
    }
    if (!cleanPhone) {
      setError("Informe o celular.");
      return;
    }
    const phoneDigits = normalizePhone(cleanPhone);
    if (!phoneDigits) {
      setError("Informe um celular válido com DDD.");
      return;
    }

    /*
     * Mesma regra do servidor (`@/lib/password`): comprimento, senha comum,
     * sequência, celular, nome e nome do bar. O `orgName` vem do servidor por
     * prop justamente para o cliente não precisar de uma segunda rodada de
     * validação: "santos2026" falha aqui, não depois do envio.
     */
    const passwordIssue = passwordProblem(password, {
      phone: phoneDigits,
      displayName: cleanName,
      orgName,
    });
    if (passwordIssue) {
      setError(passwordIssue);
      return;
    }

    setError(null);
    setPending(true);

    try {
      const result = await inviteMember({
        phone: cleanPhone,
        displayName: cleanName,
        role,
        password,
      });

      if (!result.ok) {
        setError(result.error ?? "Não foi possível criar o acesso.");
        return;
      }

      setCreated({ displayName: cleanName, phone: cleanPhone, password });
      setCopied(false);
      setCopyError(null);
      setPhone("");
      setDisplayName("");
      setPassword("");
      setPasswordVisible(true);
      setRole("staff");
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  async function handleCopy() {
    if (!created) return;
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(created.password);
      setCopied(true);
    } catch {
      setCopyError(
        "Não foi possível copiar automaticamente. Selecione a senha e copie manualmente.",
      );
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-display text-[19px] text-ink">Criar acesso</h2>

      {created ? (
        <div
          role="status"
          className="mt-3 rounded-xl border border-ok/30 bg-ok-soft p-4"
        >
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ok">
            <IconCheckCircle size={19} className="shrink-0" />
            Acesso criado
          </p>

          {/* `break-words`: nome de 60 caracteres não pode empurrar o card. */}
          <p className="mt-1 text-[13px] leading-relaxed break-words text-pretty text-ok">
            Entregue esta senha para{" "}
            <strong className="font-semibold">{created.displayName}</strong>{" "}
            junto com o celular{" "}
            {/* `whitespace-nowrap`: o hífen do celular não pode virar quebra. */}
            <span className="whitespace-nowrap">
              {formatPhone(created.phone)}
            </span>
            .
          </p>

          <p className="mt-3 text-[12px] font-semibold tracking-[0.08em] text-ok uppercase">
            Senha de acesso
          </p>

          {/*
           * Empilhado, não lado a lado: a senha agora é escolhida pelo dono e
           * pode ser longa — com o botão ao lado, o `<code>` sobrava com ~120px
           * no celular e quebrava a senha em três linhas.
           */}
          <div className="mt-1.5 flex flex-col gap-2">
            <code className="w-full rounded-lg border border-ok/30 bg-surface px-3 py-2.5 font-mono text-[15px] tracking-wide break-all text-ink select-all">
              {created.password}
            </code>
            <Button
              variant="secondary"
              onClick={handleCopy}
              aria-label="Copiar senha de acesso"
              fullWidth
            >
              <IconCopy size={18} />
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>

          <p aria-live="polite" className="mt-1.5 min-h-5 text-[12px] text-ok">
            {copyError ??
              (copied ? "Senha copiada para a área de transferência." : "")}
          </p>

          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setCopied(false);
              setCopyError(null);
            }}
            className="mt-2 inline-flex min-h-11 items-center rounded-lg text-[14px] font-medium text-ok underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Criar outro acesso
          </button>
        </div>
      ) : (
        <>
          <p className="mt-1 text-pretty text-[13px] text-ink-soft">
            Você define a senha que a pessoa vai usar para entrar.
          </p>

          {/* `method="post"`: sem isso um submit antes da hidratação vira GET e
              põe a senha na query string (histórico do navegador, logs). */}
          <form
            onSubmit={handleSubmit}
            method="post"
            noValidate
            className="mt-4 space-y-4"
          >
            {error ? (
              <div
                id={errorId}
                role="alert"
                aria-live="assertive"
                className={errorBoxClass}
              >
                <IconAlert size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div>
              <label htmlFor="convite-nome" className={labelClass}>
                Nome
              </label>
              <input
                id="convite-nome"
                type="text"
                autoComplete="off"
                autoCapitalize="words"
                maxLength={60}
                enterKeyHint="next"
                value={displayName}
                disabled={pending}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Ex.: Ana"
                className={`${inputClass} mt-1.5`}
              />
            </div>

            <div>
              <label htmlFor="convite-phone" className={labelClass}>
                Celular
              </label>
              <input
                id="convite-phone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                maxLength={15}
                enterKeyHint="next"
                value={phone}
                disabled={pending}
                onChange={(event) =>
                  setPhone(
                    formatPhone(digitsOnly(event.target.value).slice(0, 11)),
                  )
                }
                placeholder="(11) 91234-5678"
                className={`${inputClass} mt-1.5`}
              />
            </div>

            <div>
              <label htmlFor={passwordId} className={labelClass}>
                Senha
              </label>
              <div className="relative mt-1.5">
                <input
                  id={passwordId}
                  // `name` distinto do login: gerenciador de senha não deve
                  // confundir "senha nova de outra pessoa" com a sua.
                  name="invite-password"
                  type={passwordVisible ? "text" : "password"}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  value={password}
                  disabled={pending}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-describedby={passwordHintId}
                  className={`${inputClass} pr-14`}
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((current) => !current)}
                  disabled={pending}
                  aria-pressed={passwordVisible}
                  aria-label={passwordVisible ? "Ocultar senha" : "Mostrar senha"}
                  aria-controls={passwordId}
                  className="absolute top-1/2 right-1 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-soft transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {passwordVisible ? (
                    <IconEyeOff size={20} />
                  ) : (
                    <IconEye size={20} />
                  )}
                </button>
              </div>
              <p
                id={passwordHintId}
                className="mt-1.5 text-[12px] leading-snug text-ink-soft"
              >
                Pelo menos {PASSWORD_MIN_LENGTH} caracteres.
              </p>
            </div>

            <fieldset>
              <legend className={labelClass}>Papel</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="relative flex min-h-11 cursor-pointer flex-col justify-center rounded-xl border border-line-strong bg-surface px-3 py-2 transition-colors duration-150 has-[:checked]:border-brand has-[:checked]:bg-brand-soft focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand">
                  <input
                    type="radio"
                    name="invite-role"
                    value="staff"
                    checked={role === "staff"}
                    disabled={pending}
                    onChange={() => setRole("staff")}
                    className="sr-only"
                  />
                  <span className="text-[15px] font-medium text-ink">Equipe</span>
                  <span className="text-[12px] text-ink-soft">
                    anota e fecha o caixa
                  </span>
                </label>

                <label className="relative flex min-h-11 cursor-pointer flex-col justify-center rounded-xl border border-line-strong bg-surface px-3 py-2 transition-colors duration-150 has-[:checked]:border-brand has-[:checked]:bg-brand-soft focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand">
                  <input
                    type="radio"
                    name="invite-role"
                    value="owner"
                    checked={role === "owner"}
                    disabled={pending}
                    onChange={() => setRole("owner")}
                    className="sr-only"
                  />
                  <span className="text-[15px] font-medium text-ink">Dono</span>
                  <span className="text-[12px] text-ink-soft">
                    gerencia acessos
                  </span>
                </label>
              </div>
            </fieldset>

            <Button type="submit" size="lg" fullWidth disabled={pending}>
              {pending ? (
                <>
                  <IconSpinner size={20} />
                  Criando acesso…
                </>
              ) : (
                "Criar acesso"
              )}
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
