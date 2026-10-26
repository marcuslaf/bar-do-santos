export default function AppLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando o caderno…</span>

      <div className="space-y-2">
        <div className="h-7 w-32 animate-pulse rounded-md bg-surface-2" />
        <div className="h-4 w-52 animate-pulse rounded-md bg-surface-2" />
      </div>

      <div className="mt-4 h-[50px] animate-pulse rounded-xl bg-surface-2" />

      <div className="mt-3 flex gap-2">
        <div className="h-11 w-24 animate-pulse rounded-full bg-surface-2" />
        <div className="h-11 w-28 animate-pulse rounded-full bg-surface-2" />
        <div className="h-11 w-28 animate-pulse rounded-full bg-surface-2" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-xl border border-line bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="h-5 w-2/5 animate-pulse rounded bg-surface-2" />
              <div className="h-3.5 w-10 animate-pulse rounded bg-surface-2" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-surface-2" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-2" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="h-7 w-28 animate-pulse rounded-full bg-surface-2" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
