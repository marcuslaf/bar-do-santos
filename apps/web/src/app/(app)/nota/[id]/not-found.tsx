import Link from "next/link";

export default function OrderNotFound() {
  return (
    <div className="rounded-2xl border border-line bg-surface px-5 py-10 text-center">
      <h1 className="font-display text-[22px] text-ink">Nota não encontrada</h1>
      <p className="mx-auto mt-2 max-w-[36ch] text-[15px] leading-relaxed text-ink-soft">
        Ela pode ter sido removida ou o link está incompleto.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-line-strong bg-surface px-4 text-[15px] font-medium text-ink hover:bg-surface-2"
      >
        Voltar para os pedidos
      </Link>
    </div>
  );
}
