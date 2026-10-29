"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LocalCartLine {
  productId: string;
  mode: "buy" | "rent";
  days?: number;
  addedAt: string;
}

interface CartState {
  lines: LocalCartLine[];
  /** Drawer/toast UI state */
  isOpen: boolean;
  lastAdded?: { productId: string; mode: "buy" | "rent"; at: number };
  open: () => void;
  close: () => void;
  toggle: () => void;
  add: (line: Omit<LocalCartLine, "addedAt">) => void;
  setDays: (productId: string, days: number) => void;
  remove: (productId: string, mode?: "buy" | "rent") => void;
  clear: () => void;
  count: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,
      lastAdded: undefined,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      add: (line) =>
        set((state) => {
          const exists = state.lines.find((l) => l.productId === line.productId && l.mode === line.mode);
          const lines = exists
            ? state.lines.map((l) =>
                l.productId === line.productId && l.mode === line.mode ? { ...l, days: line.days ?? l.days } : l,
              )
            : [...state.lines, { ...line, addedAt: new Date().toISOString() }];
          return { lines, isOpen: true, lastAdded: { productId: line.productId, mode: line.mode, at: Date.now() } };
        }),
      setDays: (productId, days) =>
        set((state) => ({
          lines: state.lines.map((l) => (l.productId === productId && l.mode === "rent" ? { ...l, days } : l)),
        })),
      remove: (productId, mode) =>
        set((state) => ({
          lines: state.lines.filter((l) => !(l.productId === productId && (mode ? l.mode === mode : true))),
        })),
      clear: () => set({ lines: [] }),
      count: () => get().lines.length,
    }),
    { name: "bookart:cart", partialize: (state) => ({ lines: state.lines }) as unknown as CartState },
  ),
);
