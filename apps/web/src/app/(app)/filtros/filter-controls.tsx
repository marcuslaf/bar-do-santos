"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";

import { inputClass, labelClass } from "@/components/ui/styles";
import {
  BAIAO_OPTION_LABEL,
  type BaiaoOption,
  type DishTag,
} from "@/lib/dish-tags";

type BaiaoFilter = "" | BaiaoOption;

const BAIAO_OPTIONS: { value: BaiaoFilter; label: string }[] = [
  { value: "", label: "Qualquer um" },
  { value: "com", label: BAIAO_OPTION_LABEL.com },
  { value: "sem", label: BAIAO_OPTION_LABEL.sem },
];

/**
 * Filtros da lista de notas. Navegam por searchParams (`?prato=&baiao=`), então
 * o filtro é compartilhável, sobrevive ao recarregar e a busca continua no
 * servidor — a página só recebe as notas que interessam.
 */
export function FilterControls({
  tags,
  initialDish,
  initialBaiao,
}: {
  tags: DishTag[];
  initialDish: string;
  initialBaiao: BaiaoFilter;
}) {
  const router = useRouter();
  const dishId = useId();
  const [pending, startTransition] = useTransition();

  // Espelho local para o controle responder na hora do toque; ressincroniza
  // quando a navegação (ou o botão voltar) entrega outros searchParams.
  const [dish, setDish] = useState(initialDish);
  const [baiao, setBaiao] = useState<BaiaoFilter>(initialBaiao);

  useEffect(() => {
    setDish(initialDish);
    setBaiao(initialBaiao);
  }, [initialDish, initialBaiao]);

  function navigate(nextDish: string, nextBaiao: string) {
    const params = new URLSearchParams();
    if (nextDish) params.set("prato", nextDish);
    if (nextBaiao) params.set("baiao", nextBaiao);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `/filtros?${query}` : "/filtros", {
        scroll: false,
      });
    });
  }

  return (
    <section
      aria-label="Filtros"
      aria-busy={pending || undefined}
      className="mt-3 rounded-2xl border border-line bg-surface p-3.5"
    >
      <p aria-live="polite" className="sr-only">
        {pending ? "Atualizando filtros" : ""}
      </p>

      <label htmlFor={dishId} className={labelClass}>
        Prato
      </label>
      <select
        id={dishId}
        value={dish}
        onChange={(event) => {
          const next = event.target.value;
          setDish(next);
          navigate(next, baiao);
        }}
        className={`${inputClass} mt-1.5 min-h-11`}
      >
        <option value="">Todos os pratos</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>

      <fieldset className="mt-3">
        <legend className={labelClass}>Baião</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {BAIAO_OPTIONS.map((option) => (
            <label
              key={option.value || "qualquer"}
              className={[
                "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 text-[14px] font-medium transition-colors duration-150",
                "has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-ink",
                "border-line-strong bg-surface text-ink hover:bg-surface-2",
                "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand",
              ].join(" ")}
            >
              <input
                type="radio"
                name="baiao"
                value={option.value}
                checked={baiao === option.value}
                onChange={() => {
                  setBaiao(option.value);
                  navigate(dish, option.value);
                }}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
