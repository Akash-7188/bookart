import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ value, count, size = 14 }: { value: number; count?: number; size?: number }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={cn(
              i <= rounded ? "fill-amber-400 text-amber-400" : i - 0.5 === rounded ? "fill-amber-200 text-amber-400" : "text-slate-300",
            )}
          />
        ))}
      </span>
      <span className="text-xs font-semibold text-ink-700">{value > 0 ? value.toFixed(1) : "New"}</span>
      {count !== undefined ? <span className="text-xs text-ink-500">({count})</span> : null}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div> : null}
      <div>
        <p className="text-base font-bold text-ink-900">{title}</p>
        {description ? <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ring-2 transition",
                done && "bg-emerald-500 text-white ring-emerald-200",
                active && "bg-brand-600 text-white ring-brand-200",
                !done && !active && "bg-white text-ink-500 ring-slate-200",
              )}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "hidden truncate text-xs font-semibold sm:block",
                active ? "text-ink-900" : "text-ink-500",
              )}
            >
              {step}
            </span>
            {i < steps.length - 1 ? <span className="h-0.5 flex-1 rounded bg-slate-200" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "brand",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "brand" | "emerald" | "cash" | "slate" | "rose";
  icon?: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-50 text-brand-700",
    emerald: "bg-emerald-50 text-emerald-700",
    cash: "bg-cash-500/15 text-cash-600",
    slate: "bg-slate-100 text-ink-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">{label}</p>
        {icon ? <span className={cn("grid h-7 w-7 place-items-center rounded-lg", tones[tone])}>{icon}</span> : null}
      </div>
      <p className="mt-1.5 text-xl font-extrabold tracking-tight text-ink-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  count,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-brand-600 bg-brand-600 text-white shadow-[0_8px_20px_-12px_rgba(79,70,229,0.9)]"
          : "border-slate-200 bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700",
      )}
    >
      {children}
      {count !== undefined ? (
        <span className={cn("rounded-full px-1.5 text-[10px]", active ? "bg-white/25" : "bg-slate-100 text-ink-500")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-200/70", className)} />;
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "amber" | "emerald" }) {
  const tones = { brand: "bg-brand-500", amber: "bg-amber-500", emerald: "bg-emerald-500" };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={cn("h-full rounded-full transition-all", tones[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
