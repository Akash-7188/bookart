"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocationStore } from "@/store/location-store";

/**
 * URL is the single source of truth for marketplace filters, so every
 * combination is shareable and server-rendered.
 */
export function useFilterParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setRadius = useLocationStore((s) => s.setRadius);

  const get = React.useCallback((key: string) => searchParams.get(key) ?? "", [searchParams]);

  const getList = React.useCallback(
    (key: string) => (searchParams.get(key)?.split(",").filter(Boolean) ?? []) as string[],
    [searchParams],
  );

  const apply = React.useCallback(
    (patch: Record<string, string | number | string[] | null | undefined>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
          params.delete(key);
        } else if (Array.isArray(value)) {
          params.set(key, value.join(","));
        } else {
          params.set(key, String(value));
        }
      }
      if (resetPage) params.delete("page");
      if (key_of(patch) === "radiusKm" && typeof patch.radiusKm === "number") {
        setRadius(patch.radiusKm);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, setRadius],
  );

  const toggleListValue = React.useCallback(
    (key: string, value: string) => {
      const current = getList(key);
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      apply({ [key]: next });
    },
    [apply, getList],
  );

  const clearAll = React.useCallback(
    (keep: string[] = []) => {
      const params = new URLSearchParams();
      for (const key of keep) {
        const v = searchParams.get(key);
        if (v) params.set(key, v);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const activeCount = React.useMemo(() => {
    const keys = ["category", "mode", "condition", "format", "kind", "sellerKind", "min", "max", "radius"];
    return keys.filter((k) => searchParams.get(k)).length;
  }, [searchParams]);

  return { get, getList, apply, toggleListValue, clearAll, activeCount, searchParams };
}

function key_of(patch: Record<string, unknown>) {
  return Object.keys(patch)[0] ?? "";
}
