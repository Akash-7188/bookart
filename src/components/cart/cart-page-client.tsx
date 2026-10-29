"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Info, ShoppingBag, ShieldCheck, Trash2, Truck } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { useCart } from "@/components/domain/use-cart";
import { productsByIdsAction } from "@/app/actions/marketplace";
import { coverDataUri } from "@/lib/covers";
import { inr, quoteRental, RENT_TIERS } from "@/lib/rental";
import { useLocationStore } from "@/store/location-store";
import type { ProductWithDistance } from "@/lib/types";

export function CartPageClient() {
  const { lines, removeFromCart, updateDays } = useCart();
  const { latitude, longitude, city } = useLocationStore();
  const [products, setProducts] = React.useState<ProductWithDistance[]>([]);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const ids = lines.map((l) => l.productId);
    if (!ids.length) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    productsByIdsAction(ids, { latitude, longitude })
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [lines, latitude, longitude]);

  const rows = lines
    .map((line) => {
      const product = products.find((p) => p.id === line.productId);
      if (!product) return null;
      const quote = quoteRental({ product, days: line.days ?? 7 });
      return { line, product, quote };
    })
    .filter(Boolean) as { line: (typeof lines)[number]; product: ProductWithDistance; quote: ReturnType<typeof quoteRental> }[];

  const buyTotal = rows.filter((r) => r.line.mode === "buy").reduce((s, r) => s + (r.product.buyPrice ?? r.product.mrp), 0);
  const depositTotal = rows.filter((r) => r.line.mode === "rent").reduce((s, r) => s + r.quote.deposit, 0);
  const feeTotal = rows.filter((r) => r.line.mode === "rent").reduce((s, r) => s + r.quote.rentalFee, 0);
  const courier = rows.some((r) => r.line.mode === "buy" && (r.product.distanceKm ?? 0) > 25) ? 49 : 0;

  if (!loading && !rows.length) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-6 w-6" />}
        title="Your cart is empty"
        description="Add a copy to buy, or start a rental — the deposit is fully refundable after inspection."
        action={
          <Link href="/marketplace">
            <Button>Browse nearby listings</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">
        {loading ? <p className="text-sm text-ink-500">Loading cart…</p> : null}
        {rows.map(({ line, product, quote }) => (
          <Card key={`${line.productId}-${line.mode}`} className="p-3 sm:p-4">
            <div className="flex gap-3">
              <Link href={`/product/${product.id}`} className="shrink-0">
                <Image
                  src={coverDataUri(product, "front")}
                  alt=""
                  width={140}
                  height={186}
                  unoptimized
                  className="h-28 w-20 rounded-lg object-cover ring-1 ring-slate-200"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/product/${product.id}`}>
                      <p className="line-clamp-2 text-sm font-bold text-ink-900 hover:text-brand-700">{product.title}</p>
                    </Link>
                    <p className="text-xs text-ink-500">
                      {product.author} · {product.pickupArea}, {product.pickupCity}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone={line.mode === "rent" ? "cash" : "dark"}>
                        {line.mode === "rent" ? "Rental · deposit model" : "Purchase"}
                      </Badge>
                      <Badge tone="slate">{product.condition.replace(/_/g, " ")}</Badge>
                      {product.distanceKm !== null ? (
                        <Badge tone="brand">
                          <Truck className="h-3 w-3" /> {product.distanceKm.toFixed(1)} km
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(product.id, line.mode)}
                    className="rounded-lg p-1.5 text-ink-500 transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Remove from cart"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {line.mode === "rent" ? (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {RENT_TIERS.map((tier) => (
                        <button
                          key={tier.days}
                          type="button"
                          onClick={() => updateDays(product.id, tier.days)}
                          className={
                            "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition " +
                            ((line.days ?? 7) === tier.days
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-slate-200 text-ink-600 hover:border-brand-300")
                          }
                        >
                          {tier.label}
                          <span className="ml-1 font-bold">
                            {inr(product.rentalTiers.find((t) => t.days === tier.days)?.fee ?? 0)}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-ink-500">
                      Deposit {inr(quote.deposit)} · fee {inr(quote.rentalFee)} ·{" "}
                      <strong className="text-emerald-700">refundable {inr(quote.refundAmount)}</strong> · due{" "}
                      {new Date(Date.now() + (line.days ?? 7) * 864e5).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                ) : null}

                <div className="mt-3 flex items-end justify-between">
                  <p className="text-[11px] text-ink-500">
                    {line.mode === "rent" ? "Payable now (deposit)" : "Payable now"}
                  </p>
                  <p className="text-lg font-extrabold text-ink-900">
                    {inr(line.mode === "rent" ? quote.deposit : product.buyPrice ?? product.mrp)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-3 lg:sticky lg:top-36 lg:self-start">
        <Card className="p-4">
          <p className="text-sm font-extrabold text-ink-900">Price summary</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-600">Purchases ({rows.filter((r) => r.line.mode === "buy").length})</dt>
              <dd className="font-semibold text-ink-900">{inr(buyTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-600">Refundable deposits ({rows.filter((r) => r.line.mode === "rent").length})</dt>
              <dd className="font-semibold text-ink-900">{inr(depositTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-600">Rental fees (non-refundable)</dt>
              <dd className="font-semibold text-cash-600">{inr(feeTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-600">Courier (beyond 25 km)</dt>
              <dd className="font-semibold text-ink-900">{courier ? inr(courier) : "Free"}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <dt className="font-bold text-ink-900">Payable now</dt>
              <dd className="text-lg font-extrabold text-ink-900">{inr(buyTotal + depositTotal + courier)}</dd>
            </div>
          </dl>

          {depositTotal > 0 ? (
            <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-brand-50 p-2.5 text-[11px] text-brand-900">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {inr(depositTotal - feeTotal)} of what you pay is a security deposit that comes back after the seller
              verifies the returned copy.
            </p>
          ) : null}

          <Button full className="mt-3" onClick={() => router.push("/checkout")}>
            Checkout <ArrowRight className="h-4 w-4" />
          </Button>
          <Link href="/marketplace" className="mt-2 block text-center text-xs font-bold text-brand-700 hover:underline">
            Continue shopping in {city}
          </Link>
        </Card>

        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
            <Info className="h-3.5 w-3.5" /> Good to know
          </p>
          <ul className="mt-2 space-y-1.5 text-[11px] text-ink-600">
            <li>• Prices are re-checked against live listings when you hit checkout.</li>
            <li>• Rentals need the deposit paid up front — that's the seller's protection.</li>
            <li>• Late returns accrue 10% of the daily rate per day, capped at 60% of the deposit.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
