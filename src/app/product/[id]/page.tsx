import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  Languages,
  Layers,
  MapPin,
  Package,
  ScrollText,
  ShieldCheck,
  Star,
  Store,
  Tag,
} from "lucide-react";
import { Badge, Card, SectionHeader, Stars } from "@/components/ui";
import { ProductGallery } from "@/components/domain/gallery";
import { BuyBox, RentBox, SellerCard } from "@/components/domain/pdp-actions";
import { DistanceMap } from "@/components/domain/distance-map";
import { ReviewForm } from "@/components/domain/review-form";
import { ProductCard } from "@/components/domain/product-card";
import { ConditionBadge, KindBadge, SellerKindBadge, StatusBadge, VerifiedBadge } from "@/components/domain/badges";
import { getDb, getProductBySlugOrId, hydrate, queryProducts } from "@/lib/db";
import { CATEGORY_MAP, FORMAT_MAP, SELLER_KIND_LABEL } from "@/lib/constants";
import { getCurrentUser, getStoredLocation } from "@/lib/session";
import { formatDistance, haversineKm, roundKm } from "@/lib/geo";
import { inr, RENT_TIERS } from "@/lib/rental";
import {
  hostedGetProduct,
  hostedGetProductReviews,
  hostedQueryProducts,
  isSupabaseConfigured,
} from "@/lib/hosted-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = isSupabaseConfigured() ? await hostedGetProduct(id) : getProductBySlugOrId(id);
  if (!product) return { title: "Listing not found" };
  return {
    title: `${product.title} — ${product.author}`,
    description: `${product.condition.replace(/_/g, " ")} copy listed by a ${
      product.sellerId ? "Bookart seller" : "seller"
    }. Buy for ${inr(product.buyPrice ?? product.mrp)}${product.isRentable ? " or rent with a refundable deposit." : "."}`,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hosted = isSupabaseConfigured();
  const raw = hosted ? await hostedGetProduct(id) : getProductBySlugOrId(id);
  if (!raw) notFound();

  const [location, user] = await Promise.all([getStoredLocation(), getCurrentUser()]);
  const origin = { latitude: location.latitude, longitude: location.longitude };
  const product = hosted
    ? { ...raw, distanceKm: roundKm(haversineKm(origin, raw)) }
    : hydrate(raw, origin);
  const available = product.status === "available";
  const db = hosted ? null : getDb();
  const reviews = hosted
    ? await hostedGetProductReviews(product.id)
    : db!.reviews.filter((r) => r.productId === product.id).slice(0, 5);

  const query = hosted ? hostedQueryProducts : queryProducts;
  const similar = (await query({
    origin,
    radiusKm: 0,
    categories: [product.category],
    limit: 6,
    sort: "distance",
  })).items.filter((p) => p.id !== product.id);

  const meta: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <BookOpen className="h-3.5 w-3.5" />, label: "Author / Faculty", value: product.author },
    { icon: <Layers className="h-3.5 w-3.5" />, label: "Edition", value: product.edition ?? "—" },
    { icon: <Store className="h-3.5 w-3.5" />, label: "Publisher", value: product.publisher ?? "—" },
    { icon: <ScrollText className="h-3.5 w-3.5" />, label: "ISBN", value: product.isbn ?? "—" },
    { icon: <Languages className="h-3.5 w-3.5" />, label: "Language", value: product.language },
    { icon: <Package className="h-3.5 w-3.5" />, label: "Pages", value: product.pages ? String(product.pages) : "—" },
    { icon: <CalendarDays className="h-3.5 w-3.5" />, label: "Print year", value: product.year ? String(product.year) : "—" },
    { icon: <Tag className="h-3.5 w-3.5" />, label: "Format", value: FORMAT_MAP[product.format] },
  ];

  if (product.subject) meta.push({ icon: <BookOpen className="h-3.5 w-3.5" />, label: "Subject", value: product.subject });
  if (product.course) meta.push({ icon: <Layers className="h-3.5 w-3.5" />, label: "Course", value: product.course });

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6">
      <nav className="mb-3 flex items-center gap-2 text-xs text-ink-500">
        <Link href="/marketplace" className="inline-flex items-center gap-1 hover:text-brand-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Marketplace
        </Link>
        <span>/</span>
        <Link href={`/marketplace?category=${product.category}`} className="hover:text-brand-700">
          {CATEGORY_MAP[product.category].short}
        </Link>
        <span>/</span>
        <span className="truncate font-semibold text-ink-700">{product.title}</span>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* -------- Left: gallery + details -------- */}
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <ProductGallery product={product} />

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <ConditionBadge condition={product.condition} />
                <KindBadge kind={product.kind} />
                <StatusBadge status={product.status} />
                {product.seller?.verifiedSeller ? <VerifiedBadge /> : null}
              </div>

              <div>
                <h1 className="font-serif text-2xl font-bold leading-snug tracking-tight text-ink-900 sm:text-3xl">
                  {product.title}
                </h1>
                <p className="mt-1 text-sm font-semibold text-ink-600">
                  by {product.author} · {product.edition}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-500">
                <Stars value={product.rating} count={product.ratingCount} />
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {product.views} views
                </span>
                {product.seller ? <SellerKindBadge kind={product.seller.sellerKind} /> : null}
              </div>

              <DistanceMap
                buyerLabel={`${location.city} ${location.pincode}`}
                sellerLabel={product.seller?.name ?? "Seller"}
                sellerArea={product.pickupArea}
                distanceKm={product.distanceKm}
              />

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl border border-slate-200 bg-white p-4">
                {meta.map((row) => (
                  <div key={row.label} className="min-w-0">
                    <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
                      {row.icon}
                      {row.label}
                    </dt>
                    <dd className="truncate text-sm font-semibold text-ink-900">{row.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
                  <ShieldCheck className="h-3.5 w-3.5" /> Condition report
                </p>
                <p className="mt-1.5 text-sm font-bold text-ink-900">
                  {product.condition.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </p>
                {product.purchasedOn ? (
                  <p className="mt-0.5 text-xs text-ink-500">
                    Bought in{" "}
                    {new Date(`${product.purchasedOn}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}{" "}
                    · owned for {Math.max(1, Math.round((Date.now() - Date.parse(`${product.purchasedOn}-01`)) / (30 * 864e5)))} months
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-ink-500">Unused / sealed stock</p>
                )}
                <ul className="mt-2 space-y-1">
                  {(product.conditionNotes.length ? product.conditionNotes : ["No defects reported by the seller"]).map(
                    (note) => (
                      <li key={note} className="flex items-start gap-1.5 text-xs text-ink-700">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        {note}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* -------- Rent tiers at a glance -------- */}
          {product.isRentable ? (
            <Card className="p-4">
              <SectionHeader
                title="Rental tiers & deposit policy"
                description={`Deposit is the full equivalent purchase value (${inr(product.buyPrice ?? product.mrp)}). Refund = deposit − rental fee − any penalty after inspection.`}
              />
              <div className="grid gap-3 sm:grid-cols-4">
                {product.rentalTiers.map((tier) => (
                  <div key={tier.days} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-bold text-ink-500">{tier.label}</p>
                    <p className="mt-1 text-lg font-extrabold text-ink-900">{inr(tier.fee)}</p>
                    <p className="text-[11px] text-ink-500">{inr(Math.round(tier.fee / tier.days))}/day</p>
                    <p className="mt-2 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                      {inr((product.buyPrice ?? product.mrp) - tier.fee)} refundable
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-2 text-[11px] text-ink-600 sm:grid-cols-3">
                <p className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                  <strong>Return window:</strong> request a return up to 2 days before the due date from My Rentals.
                </p>
                <p className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                  <strong>Late fee:</strong> 10% of the daily rate per overdue day, capped at 60% of the deposit.
                </p>
                <p className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                  <strong>Damage grading:</strong> 0% ok · 10% minor · 35% major · 100% lost.
                </p>
              </div>
            </Card>
          ) : null}

          {/* -------- Reviews -------- */}
          <Card className="p-4">
            <SectionHeader
              title="Buyer ratings"
              description={`${reviews.length} reviews for this listing · seller score ${product.seller?.rating.toFixed(1) ?? "—"}`}
            />
            <ul className="space-y-3">
              {reviews.map((review) => {
                const buyerName: string | undefined = "buyerName" in review && typeof review.buyerName === "string"
                  ? review.buyerName
                  : db!.users.find((u) => u.id === review.buyerId)?.name;
                return (
                  <li key={review.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ink-900">{buyerName ?? "Verified buyer"}</p>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {review.score}.0
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-600">{review.comment}</p>
                    <p className="mt-1 text-[10px] text-ink-500">
                      {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </li>
                );
              })}
              {!reviews.length ? (
                <li className="rounded-xl bg-slate-50 p-3 text-xs text-ink-500">
                  No reviews yet for this copy — be the first.
                </li>
              ) : null}
            </ul>
            <div className="mt-3">
              <ReviewForm productId={product.id} signedIn={Boolean(user)} />
            </div>
          </Card>
        </div>

        {/* -------- Right: sticky action column -------- */}
        <div className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          {!available ? (
            <Card className="border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <Clock className="h-4 w-4" /> This copy is {product.status === "rented" ? "currently rented out" : "sold"}
              </p>
              <p className="mt-1 text-xs text-amber-800">
                {product.status === "rented"
                  ? "It comes back once the current renter returns it — save it to your list and we'll notify you."
                  : "Try a similar copy from another seller nearby."}
              </p>
            </Card>
          ) : null}

          <BuyBox product={product} available={available} />
          <RentBox product={product} available={available} />
          <SellerCard product={product} />

          <Card className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Pickup & delivery</p>
            <div className="mt-2 space-y-1.5 text-xs text-ink-700">
              <p className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                {product.pickupArea}, {product.pickupCity} — {product.pickupPincode}
              </p>
              <p className="flex items-start gap-1.5">
                <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                {product.seller ? SELLER_KIND_LABEL[product.seller.sellerKind] : "Seller"} ·{" "}
                {formatDistance(product.distanceKm)}
              </p>
              <p className="flex items-start gap-1.5">
                <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                Free local handover under 10 km · ₹49 courier beyond
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="slate">Returns within 3 days</Badge>
              <Badge tone="brand">Escrow protected</Badge>
              <Badge tone="amber">Condition verified</Badge>
            </div>
          </Card>
        </div>
      </div>

      {/* -------- Similar listings -------- */}
      {similar.length ? (
        <section className="mt-9">
          <SectionHeader
            title="Similar copies nearby"
            description={`Other ${CATEGORY_MAP[product.category].short.toLowerCase()} listings, nearest first`}
            action={
              <Link href={`/marketplace?category=${product.category}&sort=distance`} className="text-sm font-bold text-brand-700 hover:underline">
                See all →
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {similar.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      <p className="mt-6 text-[11px] leading-relaxed text-ink-500">
        Rental durations available: {RENT_TIERS.map((t) => t.label).join(" · ")}. Deposit held in Bookart escrow and
        released to the seller only after the buyer confirms the handover. Bookart charges the seller a 5% commission on
        sales and 12% on rental fees.
      </p>
    </div>
  );
}
