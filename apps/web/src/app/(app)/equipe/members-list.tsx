"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { IconAlert, IconSpinner } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { errorBoxClass } from "@/components/ui/styles";
import { removeMember } from "@/lib/actions/auth";
import { initials } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import type { Member } from "@/lib/types";

const ROLE_LABEL: Record<Member["role"], string> = {
  owner: "Dono",
  staff: "Equipe",
};

export function MembersList({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<Member | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (members.length === 0) {
    return (
      <p className="mt-3 text-[14px] text-ink-soft">
        Nenhum acesso cadastrado ainda.
      </p>
    );
  }

  return (
    <>
      <ul className="mt-2 divide-y divide-line">
        {members.map((member) => {
          const isSelf = member.user_id === currentUserId;
          const pending = pendingId === member.id;
          const showError = errorId === member.id && error;

          return (
            <li key={member.id} className="py-3">
              <div className="flex items-center gap-3">
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

                {isSelf ? (
                  <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold tracking-[0.06em] text-ink-soft uppercase">
                    Seu acesso
                  </span>
                ) : (
                  <Button
                    variant="dangerGhost"
                    size="compact"
                    onClick={() => {
                      setError(null);
                      setErrorId(null);
                      setTarget(member);
                    }}
                    disabled={pending}
                    aria-label={`Excluir ${member.display_name} da equipe`}
                    className="shrink-0"
                  >
                    {pending ? <IconSpinner size={18} /> : "Excluir"}
                  </Button>
                )}
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
    </>
  );
}
