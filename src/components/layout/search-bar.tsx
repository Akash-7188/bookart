"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2, MapPin, Search, TrendingUp, X } from "lucide-react";
import { searchProductsAction } from "@/app/actions/marketplace";
import { coverDataUri } from "@/lib/covers";
import { inr } from "@/lib/rental";
import { useLocationStore } from "@/store/location-store";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  title: string;
  author: string;
  price: number;
  distanceKm: number | null;
  condition: string;
}

const QUICK = ["UPSC polity", "handwritten notes", "JEE physics", "NCERT class 10", "GATE CSE", "rare Hindi books"];

export function SearchBar({ className, autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const { latitude, longitude, city } = useLocationStore();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<Suggestion[]>([]);
  const boxRef = React.useRef<HTMLDivElement>(null);

  // Debounced suggest-as-you-type against the live catalogue.
  React.useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchProductsAction({
          q,
          origin: { latitude, longitude },
          radiusKm: 0,
          limit: 6,
        });
        setResults(
          res.items.map((item) => ({
            id: item.id,
            title: item.title,
            author: item.author,
            price: item.buyPrice ?? item.mrp,
            distanceKm: item.distanceKm,
            condition: item.condition,
          })),
        );
      } finally {
        setLoading(false);
      }
    }, 240);
    return () => clearTimeout(t);
  }, [q, latitude, longitude]);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit(term = q) {
    if (!term.trim()) return;
    setOpen(false);
    router.push(`/marketplace?q=${encodeURIComponent(term.trim())}`);
  }

  return (
    <div ref={boxRef} className={cn("relative w-full", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 shadow-inner shadow-slate-50 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/12"
      >
        <Search className="h-4 w-4 shrink-0 text-ink-500" />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search title, author, ISBN, subject or course…"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-slate-400"
          aria-label="Search Bookart"
        />
        {q ? (
          <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="text-ink-500 hover:text-ink-900">
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="submit"
          className="hidden shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-700 sm:block"
        >
          Search
        </button>
      </form>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-lift)]">
          {q.trim().length < 2 ? (
            <div className="p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
                <TrendingUp className="h-3.5 w-3.5" /> Trending near {city}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setQ(term);
                      submit(term);
                    }}
                    className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="max-h-[320px] divide-y divide-slate-100 overflow-y-auto">
              {loading && results.length === 0 ? (
                <li className="flex items-center gap-2 px-3 py-4 text-sm text-ink-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching the neighbourhood…
                </li>
              ) : null}
              {!loading && results.length === 0 ? (
                <li className="px-3 py-4 text-sm text-ink-500">
                  No matches for “{q}”. Try an author, subject or ISBN.
                </li>
              ) : null}
              {results.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/product/${item.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-brand-50/60"
                  >
                    <Image
                      src={coverDataUri({ id: item.id, title: item.title, author: item.author, category: "fiction_nonfiction", coverStyle: item.title.length, condition: "gently_used" }, "front")}
                      alt=""
                      width={64}
                      height={86}
                      unoptimized
                      className="h-11 w-8 rounded object-cover ring-1 ring-slate-200"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-900">{item.title}</span>
                      <span className="block truncate text-xs text-ink-500">{item.author}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold text-ink-900">{inr(item.price)}</span>
                      {item.distanceKm !== null ? (
                        <span className="flex items-center justify-end gap-0.5 text-[11px] text-ink-500">
                          <MapPin className="h-3 w-3" />
                          {item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)} m` : `${item.distanceKm} km`}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
              {results.length ? (
                <li>
                  <button
                    type="button"
                    onClick={() => submit()}
                    className="flex w-full items-center gap-2 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-brand-700 hover:bg-brand-50"
                  >
                    <BookOpen className="h-3.5 w-3.5" /> See all results for “{q}”
                  </button>
                </li>
              ) : null}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
