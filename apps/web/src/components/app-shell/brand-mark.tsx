/**
 * Marca do app: caderninho sobre terracota. Compartilhada entre login e a tela
 * de acesso pendente para que a identidade não saia de sincronia.
 */
export function BrandMark({
  className = "h-12 w-12 shrink-0 rounded-xl",
}: {
  className?: string;
}) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className={className}>
      <rect width="64" height="64" rx="14" fill="var(--brand)" />
      <rect
        x="15"
        y="12"
        width="34"
        height="40"
        rx="4"
        fill="var(--mark-paper)"
      />
      <path d="M16 22h32" stroke="var(--brand-soft)" strokeWidth="2" />
      <path
        d="M23 31h18M23 38h18M23 45h11"
        stroke="var(--brand)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
