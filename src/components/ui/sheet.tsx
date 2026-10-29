"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight drawer/dialog (shadcn Sheet equivalent) — no portal dependency,
 * closes on ESC / backdrop click and locks background scroll.
 */
export function Sheet({
  open,
  onClose,
  side = "right",
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  side?: "right" | "bottom" | "left" | "center";
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const panelSide: Record<string, string> = {
    right: "right-0 top-0 h-full w-full max-w-md animate-slide-in-right",
    left: "left-0 top-0 h-full w-full max-w-md",
    bottom: "bottom-0 left-0 right-0 max-h-[88vh] rounded-t-3xl",
    center: "left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl",
  };

  return (
    <div className="fixed inset-0 z-[70] flex" role="dialog" aria-modal="true">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-ink-900/45 backdrop-blur-[2px] animate-fade"
      />
      <div
        className={cn(
          "absolute flex flex-col overflow-hidden bg-white shadow-[var(--shadow-lift)]",
          panelSide[side],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title ? <h2 className="truncate text-base font-bold text-ink-900">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-ink-500">{description}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-100 hover:text-ink-900"
            aria-label="Close panel"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer ? <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">{footer}</div> : null}
      </div>
    </div>
  );
}
