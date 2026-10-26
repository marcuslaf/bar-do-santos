export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "dangerGhost";

export type ButtonSize = "compact" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium select-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-strong active:bg-brand-strong",
  secondary:
    "border border-line-strong bg-surface text-ink hover:bg-surface-2 active:bg-surface-3",
  ghost: "text-ink hover:bg-surface-2 active:bg-surface-3",
  danger: "bg-danger text-on-brand hover:opacity-90 active:opacity-90",
  dangerGhost: "text-danger hover:bg-danger-soft active:bg-danger-soft",
};

const SIZES: Record<ButtonSize, string> = {
  compact: "min-h-11 px-3 text-[14px]",
  md: "min-h-11 px-4 text-[15px]",
  lg: "min-h-[52px] px-5 text-base",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
} = {}): string {
  return [BASE, VARIANTS[variant], SIZES[size], fullWidth ? "w-full" : ""]
    .filter(Boolean)
    .join(" ");
}

export const inputClass =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60";

export const labelClass =
  "block text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-soft";

export const errorBoxClass =
  "flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-[15px] text-danger";
