"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  IconAlert,
  IconCheckCircle,
  IconCopy,
  IconSpinner,
} from "@/components/ui/icons";
import { errorBoxClass, inputClass, labelClass } from "@/components/ui/styles";
import { inviteMember } from "@/lib/actions/auth";
import { digitsOnly, formatPhone, normalizePhone } from "@/lib/phone";
import type { MemberRole } from "@/lib/types";

export function InviteForm() {
  const router = useRouter();
  const errorId = useId();

  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<MemberRole>("staff");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const cleanPhone = phone.trim();
    const cleanName = displayName.trim();

    if (!cleanPhone) {
      setError("Informe o celular.");
      return;
    }
    if (!normalizePhone(cleanPhone)) {
      setError("Informe um celular válido com DDD.");
      return;
    }
    if (cleanName.length < 2) {
      setError("Informe o nome de quem vai usar o app.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const result = await inviteMember({
        phone: cleanPhone,
        displayName: cleanName,
        role,
      });

      if (!result.ok || !result.data) {
        setError(result.error ?? "Não foi possível criar o acesso.");
        return;
      }

      setTempPassword(result.data.tempPassword);
      setCopied(false);
      setCopyError(null);
      setPhone("");
      setDisplayName("");
      setRole("staff");
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  async function handleCopy() {
    if (!tempPassword) return;
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(tempPassword);
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

      {tempPassword ? (
        <div
          role="status"
          className="mt-3 rounded-xl border border-ok/30 bg-ok-soft p-4"
        >
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ok">
            <IconCheckCircle size={19} />
            Acesso criado
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-ok">
            Entregue a senha temporária abaixo. Ela não será exibida de novo.
          </p>

          <div className="mt-3 flex items-stretch gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-ok/30 bg-surface px-3 py-2.5 font-mono text-[15px] tracking-wide break-all text-ink">
              {tempPassword}
            </code>
            <Button
              variant="secondary"
              onClick={handleCopy}
              aria-label="Copiar senha temporária"
              className="shrink-0"
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
              setTempPassword(null);
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
          <p className="mt-1 text-[13px] text-ink-soft">
            A pessoa entra com o celular e a senha temporária.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
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
