import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeIndianRupee,
  BookOpenCheck,
  Building2,
  Compass,
  HandCoins,
  Landmark,
  MapPin,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { Badge, Button, Card, SectionHeader, Stars } from "@/components/ui";
import { ProductCard } from "@/components/domain/product-card";
import { RadiusSelector } from "@/components/layout/location-picker";
import { queryProducts, trendingSearches } from "@/lib/db";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/constants";
import { getStoredLocation } from "@/lib/session";
import { coverDataUri } from "@/lib/covers";
import { inr, RENT_TIERS, tierFee } from "@/lib/rental";
import type { Category } from "@/lib/types";
import type { ReactNode } from "react";
import { hostedFacetsFor, hostedQueryProducts, isSupabaseConfigured } from "@/lib/hosted-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const location = await getStoredLocation();
  const origin = { latitude: location.latitude, longitude: location.longitude };

  const query = isSupabaseConfigured() ? hostedQueryProducts : queryProducts;
  const [near, nearby, anywhere] = await Promise.all([
    query({ origin, radiusKm: 25, sort: "distance", limit: 8 }),
    query({ origin, radiusKm: 25, limit: 10_000 }),
    query({ origin, radiusKm: 0, limit: 10_000 }),
  ]);
  const nearbyCount = nearby.total;
  const anywhereCount = anywhere.total;
  const sellers = new Set(near.items.map((p) => p.seller?.id).filter(Boolean));
  const trending = isSupabaseConfigured()
    ? ["UPSC polity", "handwritten notes", "JEE physics", "NCERT class 10", "GATE CSE", "rare Hindi books"]
    : trendingSearches(6);

  const rails: { category: Category; blurb: string }[] = [
    { category: "competitive_exams", blurb: "UPSC · JEE · NEET · GATE" },
    { category: "college_notes", blurb: "Handwritten & Xerox bundles" },
    { category: "rare_books", blurb: "Collector & out-of-print" },
  ];

  const categoryRows = await Promise.all(
    rails.map(async (rail) => ({
      ...rail,
      items: (await query({
        origin,
        radiusKm: 0,
        categories: [rail.category],
        limit: 5,
        sort: "rating",
      })).items,
    })),
  );
  const spotlightSeller = near.items.find((p) => p.seller?.sellerKind === "bookstore")?.seller;

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6">
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-white via-brand-50/70 to-white p-5 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <Badge tone="brand" icon={<Sparkles className="h-3 w-3" />}>
              Now live in {location.city} · {nearbyCount} listings within 25 km
            </Badge>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-tight tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
              Buy, rent or sell books & notes —{" "}
              <span className="text-brand-700">from sellers around the corner.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-600 sm:text-base">
              Exam sets from the shop 2 km away, semester notes from a senior in the next colony, or that out-of-print
              title a library will lend. Renting works on a refundable security deposit — you get it back once the
              seller verifies the return.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/marketplace">
                <Button size="lg">
                  <Compass className="h-4 w-4" /> Explore (buy & rent)
                </Button>
              </Link>
              <Link href="/sell">
                <Button size="lg" variant="cash">
                  <Store className="h-4 w-4" /> Sell / list an item
                </Button>
              </Link>
            </div>

            <div className="mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric icon={<MapPin className="h-4 w-4" />} value={String(nearbyCount)} label="within 25 km" />
              <Metric icon={<Truck className="h-4 w-4" />} value={String(anywhereCount)} label="courier-ready" />
              <Metric icon={<ShieldCheck className="h-4 w-4" />} value="100%" label="deposit escrow" />
              <Metric icon={<Building2 className="h-4 w-4" />} value="12" label="shops & libraries" />
            </div>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Today near you</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live inventory
              </span>
            </div>
            <ul className="divide-y divide-slate-100">
              {near.items.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <Link href={`/product/${item.id}`} className="flex items-center gap-3 p-3 transition hover:bg-brand-50/50">
                    <Image
                      src={coverDataUri(item, "front")}
                      alt=""
                      width={80}
                      height={110}
                      unoptimized
                      className="h-14 w-10 rounded-md object-cover ring-1 ring-slate-200"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink-900">{item.title}</span>
                      <span className="block truncate text-xs text-ink-500">
                        {item.seller?.name} · {item.distanceKm?.toFixed(1)} km away
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-xs">
                        <span className="font-extrabold text-ink-900">{inr(item.buyPrice ?? item.mrp)}</span>
                        {item.isRentable ? (
                          <span className="font-semibold text-cash-600">
                            rent {inr(item.rentalTiers.find((t) => t.days === 30)?.fee ?? 0)}/mo
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-brand-600" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-500">Search radius</p>
              <RadiusSelector />
            </div>
          </Card>
        </div>
      </section>

      {/* ---------------- Categories ---------------- */}
      <section className="mt-8">
        <SectionHeader
          title="Browse by what you actually need"
          description="Exam prep, semester notes, board textbooks, casual reading and rare finds."
          action={
            <Link href="/marketplace" className="text-sm font-bold text-brand-700 hover:underline">
              View all →
            </Link>
          }
        />
        <div className="rail no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-5">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/marketplace?category=${cat.slug}`}
              className="w-60 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-brand-300 sm:w-auto"
            >
              <span className="text-2xl">{cat.emoji}</span>
              <p className="mt-2 text-sm font-bold text-ink-900">{cat.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{cat.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- Distance-first grid ---------------- */}
      <section className="mt-8">
        <SectionHeader
          title={`Within 25 km of ${location.city}`}
          description={`Sorted nearest-first across ${sellers.size || 4} sellers. Tap a card for the condition photos and rent terms.`}
          action={
            <Link href="/marketplace?sort=distance" className="text-sm font-bold text-brand-700 hover:underline">
              Nearest first →
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {near.items.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>

      {/* ---------------- Rental explainer ---------------- */}
      <section className="mt-10">
        <Card className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1fr_1fr]">
            <div className="p-5 sm:p-7">
              <Badge tone="cash" icon={<HandCoins className="h-3 w-3" />}>
                Deposit & refund model
              </Badge>
              <h2 className="mt-3 font-serif text-2xl font-bold tracking-tight text-ink-900">
                Rent it, read it, return it — get your deposit back.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                You pay the full equivalent purchase value up front as an <strong>active deposit</strong>. That's the
                seller's protection. When you return the copy, the seller inspects it and Bookart releases the deposit
                minus the rental fee — instantly to your wallet, or in 24–48 h to the original payment method.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  { icon: <BadgeIndianRupee className="h-4 w-4" />, title: "Deposit = item value", text: "Held in escrow, never with the seller." },
                  { icon: <BookOpenCheck className="h-4 w-4" />, title: "Flat rental fee", text: "₹/day rate, cheaper for longer tiers." },
                  { icon: <RotateCcw className="h-4 w-4" />, title: "Verified return", text: "Seller grades condition, then refund unlocks." },
                  { icon: <PackageCheck className="h-4 w-4" />, title: "Late fee 10%/day", text: "Capped at 60% of your deposit." },
                ].map((row) => (
                  <div key={row.title} className="rounded-xl border border-slate-200 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-ink-900">
                      <span className="text-brand-600">{row.icon}</span>
                      {row.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-500">{row.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/70 p-5 sm:p-7 lg:border-l lg:border-t-0">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Example · Indian Polity (₹620 copy)</p>
              <table className="mt-3 w-full text-sm">
                <tbody className="divide-y divide-slate-200">
                  {RENT_TIERS.map((tier) => {
                    const fee = tierFee(9, tier.days, 620);
                    return (
                      <tr key={tier.days}>
                        <td className="py-2 font-semibold text-ink-700">{tier.label}</td>
                        <td className="py-2 text-right text-ink-700">{inr(fee)} fee</td>
                        <td className="py-2 text-right font-bold text-emerald-700">{inr(620 - fee)} back</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 rounded-xl bg-white p-3 text-[11px] leading-relaxed text-ink-600 ring-1 ring-slate-200">
                Deposit ₹620 is collected at checkout. On return you get{" "}
                <strong>{inr(620 - tierFee(9, 30, 620))}</strong> back for the 30-day tier — the ₹{tierFee(9, 30, 620)} fee is what
                the seller earns. Damage penalties (0% / 10% / 35% / 100%) are applied only after inspection.
              </p>
              <Link href="/marketplace?mode=rent" className="mt-4 inline-block">
                <Button variant="outline" full>
                  See everything rentable <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* ---------------- Category rails ---------------- */}
      {categoryRows.map(({ category, blurb, items }) => {
        if (!items.length) return null;
        return (
          <section key={category} className="mt-9">
            <SectionHeader
              title={`${CATEGORY_MAP[category].emoji} ${CATEGORY_MAP[category].label}`}
              description={blurb}
              action={
                <Link href={`/marketplace?category=${category}`} className="text-sm font-bold text-brand-700 hover:underline">
                  View all →
                </Link>
              }
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {items.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        );
      })}

      {/* ---------------- Seller CTA ---------------- */}
      <section className="mt-10 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <Badge tone="brand" icon={<Store className="h-3 w-3" />}>
            Sell on Bookart
          </Badge>
          <h2 className="mt-3 font-serif text-2xl font-bold tracking-tight text-ink-900">
            Your shelf is somebody's syllabus.
          </h2>
          <p className="mt-2 text-sm text-ink-600">
            List a single textbook in 90 seconds or upload an entire shop's stock. Individuals list free; registered
            bookstores and libraries get a verification badge, bulk listing and a rental ledger.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { n: "01", t: "Add details", d: "Title, subject, edition, MRP vs your price." },
              { n: "02", t: "Grade condition", d: "New / Used-Good / Used-Acceptable + defects." },
              { n: "03", t: "Set pickup point", d: "GPS or shop address powers the radius search." },
            ].map((step) => (
              <div key={step.n} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-[11px] font-bold text-brand-600">{step.n}</p>
                <p className="text-sm font-bold text-ink-900">{step.t}</p>
                <p className="mt-0.5 text-[11px] text-ink-500">{step.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/sell">
              <Button>
                Start listing <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline">Register a bookstore / library</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-500">
            <Landmark className="h-3.5 w-3.5" /> Seller spotlight
          </p>
          {spotlightSeller ? (
            <>
              <div className="mt-3 flex items-center gap-3">
                <span
                  className="grid h-12 w-12 place-items-center rounded-2xl text-lg font-bold text-white"
                  style={{ backgroundColor: spotlightSeller.avatarColor }}
                >
                  {spotlightSeller.name.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink-900">{spotlightSeller.name}</p>
                  <p className="text-xs text-ink-500">
                    {spotlightSeller.sellerKind === "library" ? "Lending library" : "Bookstore"} ·{" "}
                    {spotlightSeller.city}
                  </p>
                  <Stars value={spotlightSeller.rating} count={spotlightSeller.ratingsCount} size={12} />
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-600">
                Verified GSTIN {spotlightSeller.verification.gstin ?? "—"} · stocked exam sets, board textbooks and a
                rental ledger for semester guides.
              </p>
            </>
          ) : null}
          <div className="mt-4 rounded-xl bg-brand-50 p-3 text-[11px] text-brand-900">
            <p className="font-bold">Trending searches</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {trending.map((term) => (
                <Link
                  key={term}
                  href={`/marketplace?q=${encodeURIComponent(term)}`}
                  className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold ring-1 ring-brand-200 hover:bg-brand-100"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

function Metric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
        <span className="text-brand-600">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold text-ink-900">{value}</p>
    </div>
  );
}
