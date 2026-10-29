import Link from "next/link";
import { BookOpen, Compass, SearchX } from "lucide-react";
import { FilterRail } from "@/components/marketplace/filter-rail";
import { ResultsToolbar } from "@/components/marketplace/results-toolbar";
import { ProductCard } from "@/components/domain/product-card";
import { Badge, Button, EmptyState } from "@/components/ui";
import { RadiusSelector } from "@/components/layout/location-picker";
import { facetsFor, queryProducts, type ProductFilters } from "@/lib/db";
import { CATEGORY_MAP } from "@/lib/constants";
import { getStoredLocation } from "@/lib/session";
import type { Category, Condition, Format, ItemKind, SellerKind } from "@/lib/types";
import { hostedFacetsFor, hostedQueryProducts, isSupabaseConfigured } from "@/lib/hosted-data";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type SearchParams = Record<string, string | string[] | undefined>;

function single(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function list<T extends string>(params: SearchParams, key: string): T[] | undefined {
  const raw = single(params, key);
  if (!raw) return undefined;
  return raw.split(",").filter(Boolean) as T[];
}

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const location = await getStoredLocation();

  const page = Math.max(1, Number(single(params, "page") ?? 1) || 1);
  const radiusKm = Number(single(params, "radius") ?? 25) || 0;
  const origin = { latitude: location.latitude, longitude: location.longitude };

  const filters: ProductFilters = {
    q: single(params, "q") ?? "",
    categories: list<Category>(params, "category"),
    modes: list<"buy" | "rent">(params, "mode"),
    conditions: list<Condition>(params, "condition"),
    formats: list<Format>(params, "format"),
    kinds: list<ItemKind>(params, "kind"),
    sellerKinds: list<SellerKind>(params, "sellerKind"),
    minPrice: single(params, "min") ? Number(single(params, "min")) : undefined,
    maxPrice: single(params, "max") ? Number(single(params, "max")) : undefined,
    radiusKm,
    origin,
    sort: single(params, "sort") ?? "relevance",
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const query = isSupabaseConfigured() ? hostedQueryProducts : queryProducts;
  const facetsQuery = isSupabaseConfigured() ? hostedFacetsFor : facetsFor;
  const [{ items, total }, facets] = await Promise.all([
    query(filters),
    facetsQuery({ ...filters, limit: 10_000, offset: 0 }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(next: number) {
    const usp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const v = Array.isArray(value) ? value[0] : value;
      if (v && key !== "page") usp.set(key, v);
    }
    usp.set("page", String(next));
    return `/marketplace?${usp.toString()}`;
  }

  const activeChips = [
    ...(list<Category>(params, "category")?.map((c) => ({ label: `${CATEGORY_MAP[c].emoji} ${CATEGORY_MAP[c].short}`, key: "category", value: c })) ?? []),
    ...(list<string>(params, "condition")?.map((c) => ({ label: c.replace(/_/g, " "), key: "condition", value: c })) ?? []),
    ...(list<string>(params, "mode")?.map((m) => ({ label: m === "buy" ? "Buy only" : "Rent only", key: "mode", value: m })) ?? []),
    ...(list<string>(params, "format")?.map((f) => ({ label: f.replace(/_/g, " "), key: "format", value: f })) ?? []),
    ...(list<string>(params, "kind")?.map((k) => ({ label: k, key: "kind", value: k })) ?? []),
    ...(list<string>(params, "sellerKind")?.map((s) => ({ label: `${s}s`, key: "sellerKind", value: s })) ?? []),
  ];

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6">
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-ink-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span>/</span>
        <span className="font-semibold text-ink-700">Marketplace</span>
        {filters.q ? (
          <>
            <span>/</span>
            <span className="truncate font-semibold text-ink-700">“{filters.q}”</span>
          </>
        ) : null}
      </nav>

      <div className="mb-4 rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 to-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-ink-900">
              <Compass className="h-5 w-5 text-brand-600" />
              {filters.q ? `Results for “${filters.q}”` : "Explore books, notes & study material"}
            </h1>
            <p className="mt-1 text-sm text-ink-600">
              Showing listings around <strong>{location.city}</strong> · {location.pincode}. Change radius any time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="brand" icon={<BookOpen className="h-3 w-3" />}>
              {total} matches
            </Badge>
          </div>
        </div>
        <div className="mt-3">
          <RadiusSelector />
        </div>
        {activeChips.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Filters</span>
            {activeChips.map((chip) => (
              <span
                key={`${chip.key}-${chip.value}`}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold capitalize text-ink-700 ring-1 ring-slate-200"
              >
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex gap-5">
        <FilterRail facets={facets} />

        <div className="min-w-0 flex-1">
          <ResultsToolbar facets={facets} total={total} />

          {items.length ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>

              {pages > 1 ? (
                <div className="mt-6 flex items-center justify-center gap-2">
                  {page > 1 ? (
                    <Link href={pageHref(page - 1)}>
                      <Button variant="outline" size="sm">
                        ← Previous
                      </Button>
                    </Link>
                  ) : null}
                  <span className="text-xs font-semibold text-ink-600">
                    Page {page} of {pages}
                  </span>
                  {page < pages ? (
                    <Link href={pageHref(page + 1)}>
                      <Button variant="outline" size="sm">
                        Next →
                      </Button>
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-4">
              <EmptyState
                icon={<SearchX className="h-6 w-6" />}
                title="Nothing matched those filters"
                description="Try widening the distance radius, clearing the condition filters, or searching a different subject. Sellers add fresh stock daily."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Link href="/marketplace">
                      <Button size="sm">Reset all filters</Button>
                    </Link>
                    <Link href="/sell">
                      <Button size="sm" variant="outline">
                        Ask sellers to list it
                      </Button>
                    </Link>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
