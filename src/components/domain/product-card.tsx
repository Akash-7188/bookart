"use client";

import Link from "next/link";
import Image from "next/image";
import { Eye, MapPin, ShoppingCart, Timer } from "lucide-react";
import { Button, Stars } from "@/components/ui";
import { ConditionBadge, DistancePill, KindBadge, ModeBadge, SellerKindBadge } from "./badges";
import { useCart } from "./use-cart";
import { coverDataUri } from "@/lib/covers";
import { inr } from "@/lib/rental";
import type { ProductWithDistance } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductCard({ product, className }: { product: ProductWithDistance; className?: string }) {
  const { addToCart, has } = useCart();
  const inCart = has(product.id, "buy");
  const rentFee = product.rentalTiers.find((t) => t.days === 30)?.fee ?? product.rentalTiers[0]?.fee;
  const seller = product.seller;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
        className,
      )}
    >
      <Link href={`/product/${product.id}`} className="relative block overflow-hidden bg-slate-100">
        <Image
          src={coverDataUri(product, "front")}
          alt={`${product.title} cover`}
          width={600}
          height={800}
          unoptimized
          className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.03] sm:h-48"
        />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <ConditionBadge condition={product.condition} />
        </div>
        <div className="absolute right-2 top-2">
          <ModeBadge product={product} />
        </div>
        <div className="absolute bottom-2 left-2">
          <DistancePill km={product.distanceKm} />
        </div>
        {product.status !== "available" ? (
          <div className="absolute inset-0 grid place-items-center bg-ink-900/55">
            <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-ink-900">
              {product.status === "rented" ? "Currently on rent" : "Sold out"}
            </span>
          </div>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <KindBadge kind={product.kind} />
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
            <Eye className="h-3 w-3" /> {product.views}
          </span>
        </div>

        <Link href={`/product/${product.id}`} className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink-900 group-hover:text-brand-700">
            {product.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-ink-500">{product.author}</p>
        </Link>

        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            {product.buyPrice !== null ? (
              <p className="flex items-baseline gap-1.5">
                <span className="text-base font-extrabold text-ink-900">{inr(product.buyPrice)}</span>
                {product.mrp > product.buyPrice ? (
                  <>
                    <span className="text-xs text-ink-500 line-through">{inr(product.mrp)}</span>
                    <span className="text-xs font-bold text-emerald-600">
                      {Math.round((1 - product.buyPrice / product.mrp) * 100)}% off
                    </span>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="text-sm font-bold text-cash-600">Rent only</p>
            )}
            {product.isRentable && rentFee ? (
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-cash-600">
                <Timer className="h-3 w-3" /> Rent {inr(rentFee)} / 30 days · deposit {inr(product.buyPrice ?? product.mrp)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-slate-200 pt-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-ink-700">{seller?.name ?? "Bookart seller"}</p>
            <div className="flex items-center gap-1.5">
              <Stars value={seller?.rating ?? 0} size={11} />
              {seller ? <SellerKindBadge kind={seller.sellerKind} className="hidden sm:inline-flex" /> : null}
            </div>
          </div>
          {product.buyPrice !== null && product.status === "available" ? (
            <Button
              size="iconSm"
              variant={inCart ? "success" : "outline"}
              title={inCart ? "In cart" : "Add to cart"}
              aria-label={inCart ? "In cart" : "Add to cart"}
              onClick={() => addToCart(product.id, "buy")}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-1 text-[11px] text-ink-500">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {product.pickupArea || product.pickupCity} · {product.pickupPincode}
          </span>
        </div>
      </div>
    </article>
  );
}
