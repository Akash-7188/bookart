"use client";

import { LayoutGrid, MapPin, SlidersHorizontal } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { FilterRail } from "./filter-rail";
import { useFilterParams } from "./use-filters";
import { SORT_OPTIONS } from "@/lib/constants";
import type { Facets } from "@/lib/db";
import { useLocationStore } from "@/store/location-store";

export function ResultsToolbar({ facets, total }: { facets: Facets; total: number }) {
  const { get, apply } = useFilterParams();
  const { city } = useLocationStore();
  const sort = get("sort") || "relevance";
  const radius = get("radius");

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-[var(--shadow-soft)]">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
          <LayoutGrid className="h-4 w-4" />
        </span>
        <p className="min-w-0">
          <span className="block text-sm font-bold text-ink-900">{total} listings</span>
          <span className="flex items-center gap-1 text-[11px] text-ink-500">
            <MapPin className="h-3 w-3" />
            {radius && Number(radius) > 0 ? `within ${radius} km of ${city}` : `shipping anywhere from ${city}`} ·{" "}
            {facets.sellerCount} sellers
          </span>
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="lg:hidden">
          <FilterRail facets={facets} variant="sheet" />
        </div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-600">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sort</span>
        </label>
        <Select
          value={sort}
          onChange={(e) => apply({ sort: e.target.value })}
          className="h-9 w-40 py-0 text-xs font-semibold"
          aria-label="Sort results"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Button variant="ghost" size="sm" className="hidden lg:inline-flex" onClick={() => apply({ sort: "distance" })}>
          Near me
        </Button>
      </div>
    </div>
  );
}
