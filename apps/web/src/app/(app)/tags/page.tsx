import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { IconArrowLeft } from "@/components/ui/icons";
import { getSession } from "@/lib/data";
import type { DishTag } from "@/lib/dish-tags";
import { createClient } from "@/lib/supabase/server";

import { TagsManager } from "./tags-manager";

export const metadata: Metadata = {
  title: "Pratos",
};

export default async function DishTagsPage() {
  const session = await getSession();
  if (!session) return null;
  // Catálogo de pratos é do dono: é ele que nomeia o que a cozinha vende.
  if (session.role !== "owner") redirect("/");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dish_tags")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Falha ao carregar os pratos: ${error.message}`);
  }

  const tags = (data ?? []) as DishTag[];

  return (
    <div>
      <div className="flex flex-col [@media(max-height:30rem)]:flex-row [@media(max-height:30rem)]:items-center [@media(max-height:30rem)]:gap-3 [@media(max-width:22.5rem)]:flex-row [@media(max-width:22.5rem)]:items-center [@media(max-width:22.5rem)]:gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg pr-2 text-[14px] text-ink-soft transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <IconArrowLeft size={18} />
          Voltar
        </Link>

        <h1 className="mt-1 font-display text-[27px] leading-tight text-ink [@media(max-height:30rem)]:mt-0 [@media(max-height:30rem)]:text-[22px] [@media(max-width:22.5rem)]:mt-0 [@media(max-width:22.5rem)]:text-[24px]">
          Pratos
        </h1>
      </div>

      <p className="mt-1.5 text-[13px] text-ink-soft">
        Os pratos que aparecem nos filtros de itens das notas.
      </p>

      <TagsManager tags={tags} />
    </div>
  );
}
