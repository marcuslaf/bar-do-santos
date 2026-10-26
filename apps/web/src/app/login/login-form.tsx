"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  IconAlert,
  IconEye,
  IconEyeOff,
  IconSpinner,
} from "@/components/ui/icons";
import { errorBoxClass, inputClass, labelClass } from "@/components/ui/styles";
import { signIn } from "@/lib/actions/auth";
import { digitsOnly, formatPhone, normalizePhone } from "@/lib/phone";

export function LoginForm() {
  const router = useRouter();
  const errorId = useId();
  const passwordId = useId();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setError("Informe o celular.");
      return;
    }
    if (!normalizePhone(cleanPhone)) {
      setError("Informe um celular válido com DDD.");
      return;
    }
    if (!password) {
      setError("Informe a senha.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const result = await signIn({ phone: cleanPhone, password });
      if (!result.ok) {
        setError(result.error ?? "Não foi possível entrar.");
        setPending(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Não foi possível entrar. Verifique a conexão e tente de novo.");
      setPending(false);
    }
  }

  return (
    // `method="post"`: sem isso, um submit antes da hidratação vira GET e
    // serializa celular e senha na query string (histórico do navegador, logs).
    <form
      onSubmit={handleSubmit}
      method="post"
      noValidate
      className="mt-5 space-y-4 [@media(max-height:30rem)]:mt-3 [@media(max-height:30rem)]:space-y-2 sm:mt-6"
    >
      {error ? (
        <div
          id={errorId}
          role="alert"
          aria-live="assertive"
          className={`${errorBoxClass} [@media(max-height:30rem)]:py-2 [@media(max-height:30rem)]:text-[13px]`}
        >
          <IconAlert size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div>
        <label htmlFor="phone" className={`${labelClass} mt-1.5 [@media(max-height:30rem)]:mt-1`}>
          Celular
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="username"
          autoFocus
          required
          maxLength={15}
          value={phone}
          onChange={(event) =>
            setPhone(formatPhone(digitsOnly(event.target.value).slice(0, 11)))
          }
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          placeholder="(11) 91234-5678"
          className={`${inputClass} mt-1.5 [@media(max-height:30rem)]:mt-1 [@media(max-height:30rem)]:min-h-11 [@media(max-height:30rem)]:py-2`}
        />
      </div>

      <div>
        <label htmlFor={passwordId} className={`${labelClass} mt-1.5 [@media(max-height:30rem)]:mt-1`}>
          Senha
        </label>
        <div className="relative mt-1.5 [@media(max-height:30rem)]:mt-1">
          <input
            id={passwordId}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            enterKeyHint="go"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`${inputClass} pr-14 [@media(max-height:30rem)]:min-h-11 [@media(max-height:30rem)]:py-2`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-controls={passwordId}
            className="absolute top-1/2 right-1 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-soft transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={pending}
        className="[@media(max-height:30rem)]:min-h-11"
      >
        {pending ? (
          <>
            <IconSpinner size={20} />
            Entrando…
          </>
        ) : (
          "Entrar"
        )}
      </Button>
    </form>
  );
}
