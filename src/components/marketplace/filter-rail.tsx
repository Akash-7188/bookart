"use client";

import * as React from "react";
import { Car, Filter, RotateCcw, Store, Truck, X } from "lucide-react";
import { Button, Checkbox, Chip, Sheet } from "@/components/ui";
import { useFilterParams } from "./use-filters";
import { CATEGORIES, CONDITIONS, FORMATS, ITEM_KINDS } from "@/lib/constants";
import { RADIUS_OPTIONS } from "@/lib/geo";
import { useLocationStore } from "@/store/location-store";
import { inr } from "@/lib/rental";
import { cn } from "@/lib/utils";
import type { Facets } from "@/lib/db";

const SELLER_KINDS = [
  { value: "individual", label: "Individual sellers", icon: <Store className="h-3.5 w-3.5" /> },
  { value: "bookstore", label: "Registered bookstores", icon: <Store className="h-3.5 w-3.5" /> },
  { value: "library", label: "Registered libraries", icon: <Car className="h-3.5 w-3.5" /> },
];

export function FilterRail({
  facets,
  className,
  variant = "desktop",
}: {
  facets: Facets;
  className?: string;
  variant?: "desktop" | "sheet";
}) {
  const { get, getList, apply, toggleListValue, clearAll, activeCount } = useFilterParams();
  const { city, radiusKm, setRadius } = useLocationStore();
  const [open, setOpen] = React.useState(false);

  const categories = getList("category");
  const modes = getList("mode");
  const conditions = getList("condition");
  const formats = getList("format");
  const kinds = getList("kind");
  const sellerKinds = getList("sellerKind");
  const min = Number(get("min") || 0);
  const max = Number(get("max") || Math.max(2500, facets.priceMax || 2500));
  const activeRadius = Number(get("radius") || radiusKm || 25);

  const body = (
    <div className="space-y-5">
      <section>
        <FilterTitle>Transaction type</FilterTitle>
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: "buy", label: "Buy", count: facets.byMode.buy },
            { value: "rent", label: "Rent", count: facets.byMode.rent },
          ].map((option) => (
            <Chip
              key={option.value}
              active={modes.includes(option.value)}
              count={option.count}
              onClick={() => toggleListValue("mode", option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <FilterTitle>
          Distance from {city}
        </FilterTitle>
        <div className="flex flex-wrap gap-1.5">
          {RADIUS_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              active={activeRadius === option.value}
              onClick={() => {
                setRadius(option.value);
                apply({ radius: option.value });
              }}
            >
              {option.value === 0 ? (
                <>
                  <Truck className="h-3 w-3" /> Anywhere
                </>
              ) : (
                option.label
              )}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-ink-500">
          Listings beyond 25 km are shipped by courier (₹49). Local handover is free.
        </p>
      </section>

      <section>
        <FilterTitle>Category</FilterTitle>
        <div className="space-y-0.5">
          {CATEGORIES.map((cat) => (
            <Checkbox
              key={cat.slug}
              checked={categories.includes(cat.slug)}
              onChange={() => toggleListValue("category", cat.slug)}
              label={
                <span className="flex items-center justify-between gap-2">
                  <span>
                    {cat.emoji} {cat.short}
                  </span>
                  <span className="text-[11px] text-ink-500">{facets.byCategory[cat.slug] ?? 0}</span>
                </span>
              }
            />
          ))}
        </div>
      </section>

      <section>
        <FilterTitle>Condition</FilterTitle>
        <div className="space-y-0.5">
          {CONDITIONS.map((condition) => (
            <Checkbox
              key={condition.value}
              checked={conditions.includes(condition.value)}
              onChange={() => toggleListValue("condition", condition.value)}
              label={
                <span className="flex items-center justify-between gap-2">
                  <span>{condition.label}</span>
                  <span className="text-[11px] text-ink-500">{facets.byCondition[condition.value] ?? 0}</span>
                </span>
              }
            />
          ))}
        </div>
      </section>

      <section>
        <FilterTitle>Format</FilterTitle>
        <div className="space-y-0.5">
          {FORMATS.map((format) => (
            <Checkbox
              key={format.value}
              checked={formats.includes(format.value)}
              onChange={() => toggleListValue("format", format.value)}
              label={
                <span className="flex items-center justify-between gap-2">
                  <span>{format.label}</span>
                  <span className="text-[11px] text-ink-500">{facets.byFormat[format.value] ?? 0}</span>
                </span>
              }
            />
          ))}
        </div>
      </section>

      <section>
        <FilterTitle>Item type</FilterTitle>
        <div className="flex flex-wrap gap-1.5">
          {ITEM_KINDS.map((kind) => (
            <Chip key={kind.value} active={kinds.includes(kind.value)} onClick={() => toggleListValue("kind", kind.value)}>
              {kind.label}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <FilterTitle>Seller type</FilterTitle>
        <div className="space-y-0.5">
          {SELLER_KINDS.map((seller) => (
            <Checkbox
              key={seller.value}
              checked={sellerKinds.includes(seller.value)}
              onChange={() => toggleListValue("sellerKind", seller.value)}
              label={seller.label}
            />
          ))}
        </div>
      </section>

      <section>
        <FilterTitle>Price range</FilterTitle>
        <div className="flex items-center justify-between text-xs font-bold text-ink-700">
          <span>{inr(min)}</span>
          <span>{max >= 100000 ? "No limit" : inr(max)}</span>
        </div>
        <div className="mt-1 space-y-1">
          <input
            type="range"
            min={0}
            max={5000}
            step={50}
            value={Math.min(min, 5000)}
            onChange={(e) => apply({ min: Number(e.target.value) })}
            aria-label="Minimum price"
          />
          <input
            type="range"
            min={100}
            max={5000}
            step={50}
            value={Math.min(max, 5000)}
            onChange={(e) => apply({ max: Number(e.target.value) })}
            aria-label="Maximum price"
          />
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {[
            { label: "< ₹200", min: 0, max: 200 },
            { label: "₹200–500", min: 200, max: 500 },
            { label: "₹500–1000", min: 500, max: 1000 },
            { label: "₹1000+", min: 1000, max: 5000 },
          ].map((bucket) => (
            <Chip
              key={bucket.label}
              active={min === bucket.min && max === bucket.max}
              onClick={() => apply({ min: bucket.min, max: bucket.max })}
            >
              {bucket.label}
            </Chip>
          ))}
        </div>
      </section>

      <Button
        variant="outline"
        full
        onClick={() => {
          clearAll(["q", "sort"]);
          setRadius(25);
        }}
      >
        <RotateCcw className="h-4 w-4" /> Clear all filters
      </Button>
    </div>
  );

  if (variant === "sheet") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-ink-800"
        >
          <Filter className="h-4 w-4" /> Filters
          {activeCount ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          ) : null}
        </button>
        <Sheet
          open={open}
          onClose={() => setOpen(false)}
          side="bottom"
          title="Filters"
          description={`${facets.total} listings match right now`}
          footer={
            <Button full onClick={() => setOpen(false)}>
              Show results
            </Button>
          }
        >
          {body}
        </Sheet>
      </>
    );
  }

  return (
    <aside className={cn("hidden w-64 shrink-0 lg:block", className)}>
      <div className="sticky top-32 max-h-[calc(100vh-9rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-ink-900">
            <Filter className="h-4 w-4" /> Filters
          </p>
          {activeCount ? (
            <button
              type="button"
              onClick={() => {
                clearAll(["q", "sort"]);
                setRadius(25);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline"
            >
              <X className="h-3 w-3" /> Reset
            </button>
          ) : null}
        </div>
        {body}
      </div>
    </aside>
  );
}

function FilterTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-500">{children}</p>;
}
