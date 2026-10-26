import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { formatCents, formatTime, initials } from "@/lib/format";
import type { Order } from "@/lib/types";

interface OrderCardProps {
  order: Order;
  timeZone: string;
}

export function OrderCard({ order, timeZone }: OrderCardProps) {
  const muted = order.status === "cancelado";

  return (
    <Link
      href={`/nota/${order.id}`}
      className="flex w-full min-w-0 flex-col rounded-xl border border-line bg-surface p-4 shadow-card transition-colors duration-150 hover:bg-surface-2/40 active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          className={[
            "min-w-0 font-display text-[19px] leading-snug break-words",
            muted ? "text-ink-soft" : "text-ink",
          ].join(" ")}
        >
          {order.customer_name}
        </h2>
        <StatusBadge status={order.status} className="mt-0.5 shrink-0" />
      </div>

      <p
        className={[
          "mt-1.5 text-[16px] leading-relaxed break-words whitespace-pre-wrap",
          muted ? "text-ink-soft" : "text-ink",
        ].join(" ")}
      >
        {order.description}
      </p>

      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-ink-soft"
          >
            {initials(order.author_name ?? "?")}
          </span>
          <span className="truncate text-[12px] text-ink-soft">
            {order.author_name ?? "Sem autor"}
          </span>
          <time
            dateTime={order.created_at}
            className="tabular shrink-0 text-[12px] text-ink-soft"
          >
            {formatTime(order.created_at, timeZone)}
          </time>
        </span>

        {order.total_cents !== null ? (
          <span className="tabular shrink-0 text-[15px] font-semibold text-ink">
            {formatCents(order.total_cents)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
