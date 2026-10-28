"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { Button } from "@/components/ui/button";
import {
  IconAlert,
  IconCheckCircle,
  IconEye,
  IconEyeOff,
  IconSpinner,
} from "@/components/ui/icons";
import {
  buttonClass,
  errorBoxClass,
  inputClass,
  labelClass,
} from "@/components/ui/styles";
import { changeOwnPassword } from "@/lib/actions/auth";
import { PASSWORD_MIN_LENGTH, passwordProblem } from "@/lib/password";

type Field = "current" | "new";

interface ChangePasswordFormProps {
  /** Celular de acesso, só dígitos — o mesmo contexto da validação do servidor. */
  phone: string | null;
  displayName: string;
  orgName: string;
}

/**
 * Troca da própria senha, para dono e equipe (o papel não muda nada aqui).
 *
 * A validação local repete a política do servidor (`@/lib/password`, pura e
 * executável no browser) com o mesmo contexto — celular, nome e nome do bar —
 * para o erro aparecer enquanto a pessoa digita, não depois do envio. O
 * servidor revalida: esta camada é conveniência, não autoridade.
 *
 * Campos e botão são desabilitados durante o envio (sem limpar o que foi
 * digitado): em erro a pessoa corrige o que está na tela em vez de redigitar.
 */
export function ChangePasswordForm({
  phone,
  displayName,
  orgName,
}: ChangePasswordFormProps) {
  const currentId = useId();
  const newId = useId();
  const hintId = useId();
  const errorId = useId();

  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  // Um toggle por campo (e não um só para os dois): o olho serve a trabalhos
  // diferentes — conferir o que se digitou e lembrar o que já se sabia. No
  // balcão, revelar a senha atual é o gesto que menos se quer; a nova é a que
  // costuma sair com typo.
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<Field | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  // O formulário sai da tela em caso de sucesso: sem isto o foco voltaria ao
  // <body> e o leitor de tela começaria a leitura do zero.
  useEffect(() => {
    if (done) successRef.current?.focus();
  }, [done]);

  // O `enterKeyHint="next"` do primeiro campo promete ir para o próximo: sem
  // isto, o Enter dispara o envio implícito do formulário com o campo novo
  // vazio e a pessoa leva um erro em vez de continuar digitando.
  function focusNewField(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    newRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (!currentPassword) {
      setError("Informe a senha atual.");
      setErrorField("current");
      currentRef.current?.focus();
      return;
    }

    if (!newPassword) {
      setError("Informe a senha nova.");
      setErrorField("new");
      newRef.current?.focus();
      return;
    }

    const problem = passwordProblem(newPassword, {
      phone,
      displayName,
      orgName,
    });
    if (problem) {
      setError(problem);
      setErrorField("new");
      newRef.current?.focus();
      return;
    }

    if (newPassword === currentPassword) {
      setError("A senha nova precisa ser diferente da atual.");
      setErrorField("new");
      newRef.current?.focus();
      return;
    }

    setError(null);
    setErrorField(null);
    setPending(true);

    try {
      const result = await changeOwnPassword({
        currentPassword,
        password: newPassword,
      });

      if (!result.ok) {
        setError(result.error ?? "Não foi possível trocar a senha.");
        return;
      }

      // Senha não fica pendurada em state depois do sucesso.
      setCurrentPassword("");
      setNewPassword("");
      setDone(true);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="mt-4 max-w-lg [@media(max-height:30rem)]:mt-2">
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
          <IconCheckCircle size={22} className="mt-0.5 shrink-0 text-ok" />
          <div className="min-w-0">
            <h2
              ref={successRef}
              tabIndex={-1}
              className="font-display text-[19px] leading-tight text-ink focus:outline-none"
            >
              Senha alterada
            </h2>
            {/*
             * As duas frases são medidas, não promessa: `updateUser({ password })`
             * no próprio usuário mantém esta sessão (os cookies são rotacionados
             * pelo client com cookies) e derruba as outras — o refresh token dos
             * demais aparelhos passa a falhar.
             */}
            <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
              Este aparelho continua conectado. Os outros aparelhos vão precisar
              entrar de novo.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className={`${buttonClass({ size: "lg", fullWidth: true })} mt-4`}
        >
          Voltar para os pedidos
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 max-w-lg [@media(max-height:30rem)]:mt-2">
      {/* `method="post"`: um submit antes da hidratação vira GET e põe as duas
          senhas na query string (histórico, logs). */}
      <form
        onSubmit={handleSubmit}
        method="post"
        noValidate
        aria-busy={pending || undefined}
      >
        {/*
         * Com erro, a orientação sai de cena: são duas linhas de texto
         * disputando o mesmo olhar e, em 320×568, o espaço que empurrava o
         * botão para baixo da barra flutuante. O alerta já diz o que fazer.
         */}
        {error ? null : (
          <p className="text-[13px] leading-relaxed text-ink-soft [@media(max-height:30rem)]:hidden">
            Escolha uma senha que só você saiba.
          </p>
        )}

        {error ? (
          <div
            id={errorId}
            role="alert"
            aria-live="assertive"
            className={`${errorBoxClass} mt-3`}
          >
            <IconAlert size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/*
         * Celular deitado / tablet de balcão (largura ≥ 34rem e altura ≤ 30rem):
         * os dois campos ficam lado a lado — é o que mantém o botão de confirmar
         * dentro da dobra em 568×320. Literais de propósito: o scanner do
         * Tailwind só encontra classes escritas por extenso.
         */}
        <div className="mt-3 [@media(max-height:30rem)]:mt-2 [@media(min-width:34rem)_and_(max-height:30rem)]:flex [@media(min-width:34rem)_and_(max-height:30rem)]:items-start [@media(min-width:34rem)_and_(max-height:30rem)]:gap-3">
          <div className="min-w-0 [@media(min-width:34rem)_and_(max-height:30rem)]:flex-1">
            <label htmlFor={currentId} className={labelClass}>
              Senha atual
            </label>
            <div className="relative mt-1.5 [@media(max-height:30rem)]:mt-1">
              <input
                id={currentId}
                ref={currentRef}
                // `name` próprio: não colide com `invite-password` nem
                // `member-password`, e o gerenciador de senhas não confunde as
                // três telas.
                name="senha-atual"
                type={showCurrent ? "text" : "password"}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                autoFocus
                required
                value={currentPassword}
                disabled={pending}
                onChange={(event) => setCurrentPassword(event.target.value)}
                onKeyDown={focusNewField}
                aria-invalid={errorField === "current" ? true : undefined}
                aria-describedby={errorField === "current" ? errorId : undefined}
                className={`${inputClass} pr-14 [@media(max-height:30rem)]:min-h-11 [@media(max-height:30rem)]:py-2`}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((current) => !current)}
                disabled={pending}
                aria-pressed={showCurrent}
                aria-label={
                  showCurrent ? "Ocultar senha atual" : "Mostrar senha atual"
                }
                aria-controls={currentId}
                className="absolute top-1/2 right-1 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-soft transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                {showCurrent ? (
                  <IconEyeOff size={20} />
                ) : (
                  <IconEye size={20} />
                )}
              </button>
            </div>
          </div>

          <div className="mt-3 min-w-0 [@media(min-width:34rem)_and_(max-height:30rem)]:mt-0 [@media(min-width:34rem)_and_(max-height:30rem)]:flex-1">
            <label htmlFor={newId} className={labelClass}>
              Senha nova
            </label>
            <div className="relative mt-1.5 [@media(max-height:30rem)]:mt-1">
              <input
                id={newId}
                ref={newRef}
                name="senha-nova"
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                required
                value={newPassword}
                disabled={pending}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-invalid={errorField === "new" ? true : undefined}
                aria-describedby={
                  errorField === "new" ? `${hintId} ${errorId}` : hintId
                }
                className={`${inputClass} pr-14 [@media(max-height:30rem)]:min-h-11 [@media(max-height:30rem)]:py-2`}
              />
              <button
                type="button"
                onClick={() => setShowNew((current) => !current)}
                disabled={pending}
                aria-pressed={showNew}
                aria-label={showNew ? "Ocultar senha nova" : "Mostrar senha nova"}
                aria-controls={newId}
                className="absolute top-1/2 right-1 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-soft transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                {showNew ? <IconEyeOff size={20} /> : <IconEye size={20} />}
              </button>
            </div>
            <p
              id={hintId}
              className="mt-1.5 text-[12px] leading-snug text-ink-soft [@media(max-height:30rem)]:hidden"
            >
              Pelo menos {PASSWORD_MIN_LENGTH} caracteres.
            </p>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={pending}
          className="mt-4 [@media(max-height:30rem)]:mt-2 [@media(max-height:30rem)]:min-h-11"
        >
          {pending ? (
            <>
              <IconSpinner size={20} />
              Trocando…
            </>
          ) : (
            "Trocar senha"
          )}
        </Button>

        {/*
         * Some em altura curta: em 568×320 com erro visível este parágrafo é
         * justamente o que empurra o botão para baixo da barra flutuante.
         * Vocabulário neutro de papel — o dono também usa esta tela.
         */}
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft [@media(max-height:30rem)]:hidden">
          Esqueceu a senha atual? Quem administra o bar redefine em Equipe.
        </p>
      </form>
    </div>
  );
}
