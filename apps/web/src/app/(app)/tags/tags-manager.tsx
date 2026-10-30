"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { IconAlert, IconPencil, IconSpinner, IconX } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { errorBoxClass, inputClass, labelClass } from "@/components/ui/styles";
import { createDishTag, deleteDishTag, updateDishTag } from "@/lib/actions/dishes";
import type { DishTag } from "@/lib/dish-tags";

/** Mesmo teto do check `dish_tags_name_check` (1 a 60). */
const MAX_NAME_LENGTH = 60;

export function TagsManager({ tags }: { tags: DishTag[] }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState<DishTag | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editPending, setEditPending] = useState(false);

  const [removing, setRemoving] = useState<DishTag | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removePending, setRemovePending] = useState(false);

  const [announcement, setAnnouncement] = useState("");

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setCreateError("Informe o nome do prato.");
      return;
    }

    setCreateError(null);
    setCreating(true);

    try {
      const result = await createDishTag({ name: trimmed });
      if (!result.ok) {
        setCreateError(result.error ?? "Não foi possível criar o prato.");
        return;
      }
      setName("");
      setAnnouncement(`Prato ${trimmed} adicionado.`);
      router.refresh();
    } catch {
      setCreateError("Falha de conexão. Tente novamente.");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(tag: DishTag) {
    setEditing(tag);
    setEditName(tag.name);
    setEditError(null);
  }

  function closeEdit() {
    setEditing(null);
    setEditName("");
    setEditError(null);
  }

  async function handleEdit() {
    const target = editing;
    if (!target || editPending) return;

    const trimmed = editName.trim();
    if (trimmed.length === 0) {
      setEditError("Informe o nome do prato.");
      return;
    }

    setEditError(null);
    setEditPending(true);

    try {
      const result = await updateDishTag({ id: target.id, name: trimmed });
      if (!result.ok) {
        setEditError(result.error ?? "Não foi possível salvar o prato.");
        return;
      }
      closeEdit();
      setAnnouncement(`Prato ${trimmed} atualizado.`);
      router.refresh();
    } catch {
      setEditError("Falha de conexão. Tente novamente.");
    } finally {
      setEditPending(false);
    }
  }

  function openRemove(tag: DishTag) {
    setRemoving(tag);
    setRemoveError(null);
  }

  function closeRemove() {
    setRemoving(null);
    setRemoveError(null);
  }

  async function handleRemove() {
    const target = removing;
    if (!target || removePending) return;

    setRemoveError(null);
    setRemovePending(true);

    try {
      const result = await deleteDishTag({ id: target.id });
      if (!result.ok) {
        setRemoveError(result.error ?? "Não foi possível excluir o prato.");
        return;
      }
      setAnnouncement(`Prato ${target.name} excluído.`);
      closeRemove();
      router.refresh();
    } catch {
      setRemoveError("Falha de conexão. Tente novamente.");
    } finally {
      setRemovePending(false);
    }
  }

  return (
    <div className="mt-4">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-display text-[19px] text-ink">Novo prato</h2>

        <form onSubmit={handleCreate} className="mt-2.5">
          <label htmlFor="novo-prato" className={labelClass}>
            Nome do prato
          </label>
          <div className="mt-1.5 flex flex-col gap-2 [@media(min-width:22.5rem)]:flex-row">
            <input
              id="novo-prato"
              type="text"
              maxLength={MAX_NAME_LENGTH}
              enterKeyHint="done"
              autoComplete="off"
              placeholder="Ex.: frango frito"
              value={name}
              disabled={creating}
              onChange={(event) => setName(event.target.value)}
              className={`${inputClass} min-w-0 flex-1`}
            />
            <Button
              type="submit"
              disabled={creating}
              className="shrink-0 [@media(max-width:22.5rem)]:w-full"
            >
              {creating ? (
                <>
                  <IconSpinner size={18} />
                  Salvando…
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>

          {createError ? (
            <div
              role="alert"
              aria-live="assertive"
              className={`${errorBoxClass} mt-2.5`}
            >
              <IconAlert size={18} className="mt-0.5 shrink-0" />
              <span>{createError}</span>
            </div>
          ) : null}
        </form>
      </section>

      <section className="mt-3 rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-display text-[19px] text-ink">
          Pratos cadastrados
          <span className="ml-2 text-[13px] font-normal text-ink-soft">
            {tags.length}
          </span>
        </h2>

        {tags.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-soft">
            Nenhum prato cadastrado ainda. Crie o primeiro acima — ele aparece no
            formulário de item da nota e nos filtros.
          </p>
        ) : (
          <ul className="mt-1 divide-y divide-line">
            {tags.map((tag) => (
              <li key={tag.id} className="py-2.5">
                <p className="text-[15px] leading-snug break-words text-ink">
                  {tag.name}
                </p>

                {/* Ações em linha própria para o nome nunca ser espremido em 320px. */}
                <div className="mt-1.5 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="compact"
                    onClick={() => openEdit(tag)}
                    aria-label={`Editar ${tag.name}`}
                  >
                    <IconPencil size={17} />
                    Editar
                  </Button>
                  <Button
                    variant="dangerGhost"
                    size="compact"
                    onClick={() => openRemove(tag)}
                    aria-label={`Excluir ${tag.name}`}
                  >
                    <IconX size={17} />
                    Excluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing ? (
        <Modal
          open
          onClose={closeEdit}
          title="Editar prato"
          description="O novo nome vale para as notas novas e para os filtros."
          footer={
            <>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={closeEdit}
                disabled={editPending}
              >
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={handleEdit}
                disabled={editPending}
              >
                {editPending ? (
                  <>
                    <IconSpinner size={18} />
                    Salvando…
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </>
          }
        >
          {editError ? (
            <div
              role="alert"
              aria-live="assertive"
              className={`${errorBoxClass} mb-4`}
            >
              <IconAlert size={18} className="mt-0.5 shrink-0" />
              <span>{editError}</span>
            </div>
          ) : null}

          <label htmlFor="editar-prato" className={labelClass}>
            Nome do prato
          </label>
          <input
            id="editar-prato"
            data-autofocus
            type="text"
            maxLength={MAX_NAME_LENGTH}
            enterKeyHint="done"
            autoComplete="off"
            value={editName}
            disabled={editPending}
            onChange={(event) => setEditName(event.target.value)}
            className={`${inputClass} mt-1.5`}
          />
        </Modal>
      ) : null}

      {removing ? (
        <Modal
          open
          onClose={closeRemove}
          title="Excluir prato"
          description={`“${removing.name}” sai do catálogo e dos filtros.`}
          footer={
            <>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={closeRemove}
                disabled={removePending}
              >
                Manter prato
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleRemove}
                disabled={removePending}
              >
                {removePending ? (
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
          {removeError ? (
            <div
              role="alert"
              aria-live="assertive"
              className={`${errorBoxClass} mb-4`}
            >
              <IconAlert size={18} className="mt-0.5 shrink-0" />
              <span>{removeError}</span>
            </div>
          ) : null}
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Só dá para excluir um prato que ainda não foi usado em nenhuma nota.
            Se ele já está em uso, o cadastro é preservado.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
