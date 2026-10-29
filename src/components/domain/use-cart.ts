"use client";

import { useCallback } from "react";
import { cartAddAction, cartRemoveAction, cartUpdateAction } from "@/app/actions/marketplace";
import { useCartStore } from "@/store/cart-store";

/**
 * Client cart (instant UX, works signed-out) mirrored to the server so
 * checkout can re-price against live listings.
 */
export function useCart() {
  const lines = useCartStore((s) => s.lines);
  const add = useCartStore((s) => s.add);
  const remove = useCartStore((s) => s.remove);
  const setDays = useCartStore((s) => s.setDays);
  const open = useCartStore((s) => s.open);
  const close = useCartStore((s) => s.close);

  const addToCart = useCallback(
    (productId: string, mode: "buy" | "rent", days?: number) => {
      add({ productId, mode, days });
      void cartAddAction(productId, mode, days).catch(() => undefined);
    },
    [add],
  );

  const removeFromCart = useCallback(
    (productId: string, mode?: "buy" | "rent") => {
      remove(productId, mode);
      void cartRemoveAction(productId, mode).catch(() => undefined);
    },
    [remove],
  );

  const updateDays = useCallback(
    (productId: string, days: number) => {
      setDays(productId, days);
      void cartUpdateAction(productId, days).catch(() => undefined);
    },
    [setDays],
  );

  const has = useCallback(
    (productId: string, mode?: "buy" | "rent") =>
      lines.some((l) => l.productId === productId && (mode ? l.mode === mode : true)),
    [lines],
  );

  return { lines, count: lines.length, addToCart, removeFromCart, updateDays, has, open, close };
}
