"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  IconAlert,
  IconCheckCircle,
  IconEye,
  IconEyeOff,
  IconSpinner,
} from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { errorBoxClass, inputClass, labelClass } from "@/components/ui/styles";
import { removeMember, resetMemberPassword } from "@/lib/actions/auth";
import { initials } from "@/lib/format";
import { PASSWORD_MIN_LENGTH, passwordProblem } from "@/lib/password";
import { formatPhone } from "@/lib/phone";
import type { Member } from "@/lib/types";

const ROLE_LABEL: Record<Member["role"], string> = {
  owner: "Dono",
  staff: "Equipe",
};

export function MembersList({
  members,
  currentUserId,
  orgName,
}: {
  members: Member[];
  currentUserId: string;
  orgName: string;
}) {
  const router = useRouter();
  const resetFormId = useId();
  const resetInputId = useId();
  const resetHintId = useId();

  // Exclusão de vínculo.
  const [target, setTarget] = useState<Member | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redefinição de senha. A senha mora só neste state: é limpa ao fechar e
  // nunca aparece na lista — o dono acabou de digitá-la.
  const [resetTarget, setResetTarget] = useState<Member | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetVisible, setResetVisible] = useState(true);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetPendingId, setResetPendingId] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  async function handleRemove() {
    if (!target || pendingId) return;
    const member = target;

    setPendingId(member.id);
    setError(null);
    setErrorId(null);

    try {
      const result = await removeMember(member.id);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível excluir o acesso.");
        setErrorId(member.id);
        return;
      }
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
      setErrorId(member.id);
    } finally {
      setPendingId(null);
      setTarget(null);
    }
  }

  function openReset(member: Member) {
    setResetTarget(member);
    setResetPassword("");
    // Visível por padrão, como no convite: o erro provável é typo, e typo só
    // aparece em campo que a pessoa consegue ler.
    setResetVisible(true);
    setResetError(null);
    // Um novo pedido apaga a confirmação anterior para não sugerir que ela
    // vale para esta pessoa.
    setDoneId(null);
    setAnnouncement("");
  }

  function closeReset() {
    setResetTarget(null);
    setResetPassword("");
    setResetVisible(true);
    setResetError(null);
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const member = resetTarget;
    if (!member || resetPendingId) return;

    /*
     * Mesma regra do servidor (`@/lib/password`), com o mesmo contexto: o
     * `orgName` vem por prop para "santos2026" falhar aqui, não só depois do
     * envio. O campo não é limpo em caso de erro.
     */
    const problem = passwordProblem(resetPassword, {
      phone: member.phone,
      displayName: member.display_name,
      orgName,
    });
    if (problem) {
      setResetError(problem);
      return;
    }

    setResetError(null);
    setResetPendingId(member.id);

    try {
      const result = await resetMemberPassword({
        memberId: member.id,
        password: resetPassword,
      });

      if (!result.ok) {
        setResetError(result.error ?? "Não foi possível redefinir a senha.");
        return;
      }

      const isSelf = member.user_id === currentUserId;
      closeReset();
      setDoneId(member.id);
      setAnnouncement(
        isSelf
          ? "Sua senha foi redefinida."
          : `Senha de ${member.display_name} redefinida.`,
      );
      router.refresh();
    } catch {
      setResetError("Falha de conexão. Tente novamente.");
    } finally {
      setResetPendingId(null);
    }
  }

  if (members.length === 0) {
    return (
      <p className="mt-3 text-[14px] text-ink-soft">
        Nenhum acesso cadastrado ainda.
      </p>
    );
  }

  const resetIsSelf = resetTarget !== null && resetTarget.user_id === currentUserId;
  const resetPhone = resetTarget?.phone ? formatPhone(resetTarget.phone) : null;

  return (
    <>
      {/*
       * Região viva fixa: o aviso visível aparece dentro da linha, mas quem usa
       * leitor de tela pode estar com o foco em outro ponto da lista. Uma região
       * que já existe no DOM é mais confiável do que anunciar um nó recém-criado.
       */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <ul className="mt-2 divide-y divide-line">
        {members.map((member) => {
          const isSelf = member.user_id === currentUserId;
          const pending = pendingId === member.id;
          const resetPending = resetPendingId === member.id;
          const showError = errorId === member.id && error;
          const showDone = doneId === member.id;

          return (
            <li key={member.id} className="py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span
                  aria-hidden="true"
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
                    member.active
                      ? "bg-surface-2 text-ink-soft"
                      : "bg-neutral-soft text-ink-soft",
                  ].join(" ")}
                >
                  {initials(member.display_name)}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      "truncate text-[15px] font-medium",
                      member.active ? "text-ink" : "text-ink-soft",
                    ].join(" ")}
                  >
                    {member.display_name}
                    {isSelf ? (
                      <span className="text-[12px] font-normal text-ink-soft">
                        {" (você)"}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-ink-soft">
                    <span>{ROLE_LABEL[member.role]}</span>
                    {/* No celular o "·" sobrava no fim da linha depois do wrap. */}
                    <span aria-hidden className="hidden sm:inline">·</span>
                    <span>
                      <span className="sr-only">Celular: </span>
                      {member.phone ? formatPhone(member.phone) : "—"}
                    </span>
                    <span aria-hidden className="hidden sm:inline">·</span>
                    <span className="flex items-center gap-1">
                      <span
                        aria-hidden="true"
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          member.active ? "bg-ok" : "bg-line-strong",
                        ].join(" ")}
                      />
                      {member.active ? "Ativo" : "Inativo"}
                    </span>
                  </p>
                </div>

                {/*
                 * Ações em linha própria em qualquer largura. No topo elas
                 * espremiam o nome (123px de coluna em 320px) e, no cartão
                 * estreito do layout de duas colunas, o mesmo acontecia no
                 * desktop; abaixo, nome e celular ficam com a linha inteira.
                 *
                 * O badge "Seu acesso" desceu junto de propósito: ele ocupa
                 * exatamente o lugar onde ficaria o "Excluir" que a linha não
                 * tem — é ali que a ausência precisa ser explicada. No topo
                 * ele espremia o nome para 95px e quebrava o celular em três
                 * linhas.
                 */}
                <div
                  className={[
                    "flex w-full flex-wrap gap-2",
                    isSelf ? "items-center justify-between" : "justify-end",
                  ].join(" ")}
                >
                  {isSelf ? (
                    <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold tracking-[0.06em] text-ink-soft uppercase">
                      Seu acesso
                    </span>
                  ) : null}

                  <Button
                    variant="ghost"
                    size="compact"
                    onClick={() => openReset(member)}
                    disabled={pending || resetPending}
                    aria-label={
                      isSelf
                        ? undefined
                        : `Redefinir senha de ${member.display_name}`
                    }
                    className="shrink-0"
                  >
                    {isSelf ? "Trocar senha" : "Redefinir senha"}
                  </Button>

                  {isSelf ? null : (
                    <Button
                      variant="dangerGhost"
                      size="compact"
                      onClick={() => {
                        setError(null);
                        setErrorId(null);
                        setTarget(member);
                      }}
                      disabled={pending || resetPending}
                      aria-label={`Excluir ${member.display_name} da equipe`}
                      className="shrink-0"
                    >
                      {pending ? <IconSpinner size={18} /> : "Excluir"}
                    </Button>
                  )}
                </div>
              </div>

              {showError ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  className={`${errorBoxClass} mt-2`}
                >
                  <IconAlert size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              {showDone ? (
                <p className="mt-1.5 flex items-start gap-2 text-[13px] leading-snug text-ok">
                  <IconCheckCircle size={17} className="mt-px shrink-0" />
                  <span>
                    {isSelf
                      ? "Sua senha foi redefinida."
                      : `Senha de ${member.display_name} redefinida.`}
                  </span>
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {target ? (
        <Modal
          open
          onClose={() => {
            if (pendingId) return;
            setTarget(null);
          }}
          title="Excluir da equipe?"
          footer={
            <>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setTarget(null)}
                disabled={pendingId !== null}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleRemove}
                disabled={pendingId !== null}
              >
                {pendingId ? (
                  <>
                    <IconSpinner size={18} />
                    Excluindo…
                  </>
                ) : (
                  "Excluir"
                )}
              </Button>
            </>
          }
        >
          <p className="text-[15px] leading-relaxed text-ink-soft">
            <strong className="font-semibold text-ink">
              {target.display_name}
            </strong>{" "}
            perde o acesso na hora. As notas que já anotou continuam no caixa.
          </p>
        </Modal>
      ) : null}

      {resetTarget ? (
        <Modal
          open
          onClose={() => {
            if (resetPendingId) return;
            closeReset();
          }}
          title={resetIsSelf ? "Trocar sua senha?" : "Redefinir senha?"}
          /*
           * O aviso sobre sessão fica na `description`: além de aparecer sob o
           * título, entra no `aria-describedby` do diálogo, então é lido na
           * abertura — antes de a pessoa digitar.
           *
           * O briefing pedia "a sessão que já está aberta continua valendo",
           * mas a medição no stack real (Supabase local) mostra o contrário:
           * `admin.updateUserById({ password })` revoga os refresh tokens do
           * alvo — quem estava no app cai no próximo carregamento, e no próprio
           * acesso isso acontece na hora (o dono é jogado para /login). A copy
           * abaixo diz o que acontece, não o que se esperava.
           */
          description={
            resetIsSelf
              ? "Vale no próximo login. Você sai deste aparelho e entra de novo com ela."
              : "Vale no próximo login. Quem já estava no app vai precisar entrar de novo com ela."
          }
          footer={
            <>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={closeReset}
                disabled={resetPendingId !== null}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form={resetFormId}
                className="flex-1"
                disabled={resetPendingId !== null}
              >
                {resetPendingId ? (
                  <>
                    <IconSpinner size={18} />
                    Salvando…
                  </>
                ) : (
                  "Salvar senha"
                )}
              </Button>
            </>
          }
        >
          {/* `method="post"`: mesma razão do convite — sem ele, um submit antes
              da hidratação vira GET e põe a senha na query string. */}
          <form
            id={resetFormId}
            onSubmit={handleReset}
            method="post"
            noValidate
            className="space-y-4"
          >
            <p className="text-[15px] leading-relaxed break-words text-pretty text-ink-soft">
              {resetIsSelf ? (
                resetPhone ? (
                  <>
                    Você entra com o celular{" "}
                    <span className="whitespace-nowrap">{resetPhone}</span>.
                  </>
                ) : (
                  "Senha nova para o seu acesso."
                )
              ) : (
                <>
                  Senha nova para{" "}
                  <strong className="font-semibold text-ink">
                    {resetTarget.display_name}
                  </strong>
                  {resetPhone ? (
                    <>
                      , que entra com o celular{" "}
                      <span className="whitespace-nowrap">{resetPhone}</span>.
                    </>
                  ) : null}
                </>
              )}
            </p>

            <div>
              <label htmlFor={resetInputId} className={labelClass}>
                Senha nova
              </label>
              <div className="relative mt-1.5">
                <input
                  id={resetInputId}
                  // `name` próprio: gerenciador de senha não deve confundir a
                  // senha de outra pessoa com a sua, nem com a do convite.
                  name="member-password"
                  type={resetVisible ? "text" : "password"}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  // O modal espera este atributo para abrir com o foco no campo.
                  data-autofocus="true"
                  value={resetPassword}
                  disabled={resetPendingId !== null}
                  onChange={(event) => setResetPassword(event.target.value)}
                  aria-describedby={resetHintId}
                  className={`${inputClass} pr-14`}
                />
                <button
                  type="button"
                  onClick={() => setResetVisible((current) => !current)}
                  disabled={resetPendingId !== null}
                  aria-pressed={resetVisible}
                  aria-label={resetVisible ? "Ocultar senha" : "Mostrar senha"}
                  aria-controls={resetInputId}
                  className="absolute top-1/2 right-1 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-soft transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetVisible ? (
                    <IconEyeOff size={20} />
                  ) : (
                    <IconEye size={20} />
                  )}
                </button>
              </div>
              <p
                id={resetHintId}
                className="mt-1.5 text-[12px] leading-snug text-ink-soft"
              >
                Pelo menos {PASSWORD_MIN_LENGTH} caracteres.
              </p>
            </div>

            {resetError ? (
              <div
                role="alert"
                aria-live="assertive"
                className={errorBoxClass}
              >
                <IconAlert size={18} className="mt-0.5 shrink-0" />
                <span>{resetError}</span>
              </div>
            ) : null}

            {resetIsSelf ? null : (
              <p className="text-[13px] leading-relaxed text-ink-soft">
                Entregue a senha nova à pessoa: a antiga para de funcionar. Ela
                continua na equipe — para cortar o acesso de vez, use{" "}
                <strong className="font-semibold text-ink">Excluir</strong>.
              </p>
            )}
          </form>
        </Modal>
      ) : null}
    </>
  );
}
