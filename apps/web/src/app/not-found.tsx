import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="font-display text-[24px] text-ink">Página não encontrada</h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        O endereço que você abriu não existe ou a nota foi removida.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-[15px] font-medium text-on-brand"
      >
        Voltar para os pedidos
      </Link>
    </div>
  );
}
