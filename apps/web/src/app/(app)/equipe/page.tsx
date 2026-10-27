import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getMembers, getSession } from "@/lib/data";

import { InviteForm } from "./invite-form";
import { MembersList } from "./members-list";

export const metadata: Metadata = {
  title: "Equipe",
};

export default async function TeamPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "owner") redirect("/");

  const members = await getMembers();

  return (
    <div>
      <h1 className="font-display text-[27px] leading-tight text-ink">Equipe</h1>
      <p className="mt-1.5 text-[13px] text-ink-soft">
        Quem tem acesso ao caderno deste bar
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-display text-[19px] text-ink">Acessos</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Você define a senha de cada pessoa. Redefina quando precisar e
            exclua quem saiu: o acesso cai na hora e as notas antigas continuam
            no caixa.
          </p>

          <MembersList
            members={members}
            currentUserId={session.userId}
            orgName={session.orgName}
          />
        </section>

        <InviteForm orgName={session.orgName} />
      </div>
    </div>
  );
}

