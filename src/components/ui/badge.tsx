import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "slate",
  children,
  icon,
}: {
  className?: string;
  tone?: "slate" | "brand" | "emerald" | "sky" | "amber" | "rose" | "cash" | "dark";
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-ink-700 ring-slate-200",
    brand: "bg-brand-50 text-brand-700 ring-brand-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    sky: "bg-sky-50 text-sky-700 ring-sky-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    cash: "bg-cash-500/15 text-cash-600 ring-cash-500/30",
    dark: "bg-ink-900 text-white ring-ink-900",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
