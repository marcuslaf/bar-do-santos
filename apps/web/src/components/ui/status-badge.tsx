import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/types";

const BADGE: Record<OrderStatus, string> = {
  aberto: "bg-warn-soft text-warn",
  entregue: "bg-info-soft text-info",
  pago: "bg-ok-soft text-ok",
  cancelado: "bg-neutral-soft text-ink-soft",
};

export function StatusBadge({
  status,
  className = "",
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold uppercase tracking-[0.09em] whitespace-nowrap",
        BADGE[status],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
