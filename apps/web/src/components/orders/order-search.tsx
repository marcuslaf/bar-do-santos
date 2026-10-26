"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { IconSearch } from "@/components/ui/icons";
import { inputClass } from "@/components/ui/styles";

type Filter = "todos" | "abertos" | "prontos";

/**
 * Busca por nome ou texto do pedido. Navega no cliente para não recarregar
 * a página inteira no celular; mantém o filtro ativo junto.
 */
export function OrderSearch({
  initialQuery,
  status,
}: {
  initialQuery: string;
  status: Filter;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  // Mantém o campo em sincronia com a URL (chips, "limpar busca", voltar).
  const urlQuery = searchParams.get("q") ?? "";

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    const value = query.trim().slice(0, 60);
    if (value) params.set("q", value);
    if (status !== "todos") params.set("status", status);

    const search = params.toString();
    router.push(search ? `/?${search}` : "/");
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Buscar notas"
      className="relative mt-4"
    >
      <label htmlFor="busca" className="sr-only">
        Buscar por nome do cliente ou texto do pedido
      </label>
      <IconSearch
        size={20}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft"
      />
      <input
        id="busca"
        name="q"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        maxLength={60}
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Buscar nome ou pedido"
        className={`${inputClass} pl-11`}
      />
    </form>
  );
}
