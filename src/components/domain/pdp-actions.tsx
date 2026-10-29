"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CalendarClock,
  CircleDollarSign,
  Info,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Timer,
  Truck,
  Wallet,
} from "lucide-react";
import { Badge, Button, Card, RadioTile } from "@/components/ui";
import { useCart } from "./use-cart";
import { rentNowAction } from "@/app/actions/marketplace";
import { inr, quoteRental } from "@/lib/rental";
import type { Product, ProductWithDistance } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Buy box                                                             */
/* ------------------------------------------------------------------ */

export function BuyBox({ product, available }: { product: Product; available: boolean }) {
  const { addToCart, has } = useCart();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  if (product.buyPrice === null) return null;
  const inCart = has(product.id, "buy");

  return (
    <Card className="p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Buy this copy</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-extrabold tracking-tight text-ink-900">{inr(product.buyPrice)}</span>
        {product.mrp > product.buyPrice ? (
          <>
            <span className="text-sm text-ink-500 line-through">{inr(product.mrp)}</span>
            <Badge tone="emerald">{Math.round((1 - product.buyPrice / product.mrp) * 100)}% off MRP</Badge>
          </>
        ) : null}
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
        <Truck className="h-3.5 w-3.5" /> Free pickup within 10 km · ₹49 courier beyond
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          full
          disabled={!available}
          onClick={() => {
            addToCart(product.id, "buy");
            router.refresh();
          }}
        >
          <ShoppingCart className="h-4 w-4" /> {inCart ? "In cart" : "Add to cart"}
        </Button>
        <Button
          full
          variant="cash"
          disabled={!available}
          loading={busy}
          onClick={() => {
            setBusy(true);
            addToCart(product.id, "buy");
            router.push("/checkout");
          }}
        >
          Buy now
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Rent box — the deposit & refund engine, surfaced                     */
/* ------------------------------------------------------------------ */

export function RentBox({ product, available }: { product: ProductWithDistance; available: boolean }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [days, setDays] = React.useState(product.rentalTiers[0]?.days ?? 7);
  const [result, setResult] = React.useState<{ ok: boolean; message: string; rentalId?: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (!product.isRentable) return null;

  const quote = quoteRental({ product, days });
  const tiers = product.rentalTiers.length ? product.rentalTiers : [];

  async function handleRent() {
    setBusy(true);
    const res = await rentNowAction(product.id, days);
    setBusy(false);
    if (res.ok) {
      setResult({
        ok: true,
        message: `Deposit of ${inr(res.deposit ?? quote.deposit)} held in escrow. Refundable amount on return: ${inr((res.deposit ?? quote.deposit) - quote.rentalFee)}.`,
        rentalId: res.rentalId,
      });
      router.refresh();
    } else {
      setResult({ ok: false, message: res.error ?? "Could not start the rental. Please sign in first." });
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2.5 text-white">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
          <Timer className="h-3.5 w-3.5" /> Rent this item
        </p>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">Deposit & refund protected</span>
      </div>

      <div className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Choose rental duration</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {tiers.map((tier) => (
            <RadioTile
              key={tier.days}
              checked={days === tier.days}
              onChange={() => setDays(tier.days)}
              title={tier.label}
              subtitle={`${inr(tier.fee)} · ${inr(tier.fee / tier.days)}/day`}
            />
          ))}
        </div>

        <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
          <Row
            icon={<ShieldCheck className="h-4 w-4 text-brand-600" />}
            label="Security deposit (pay now)"
            value={inr(quote.deposit)}
            hint="Full equivalent purchase value, held in escrow"
            strong
          />
          <Row
            icon={<CircleDollarSign className="h-4 w-4 text-cash-600" />}
            label={`Rental fee · ${days} days`}
            value={inr(quote.rentalFee)}
            hint={`${inr(quote.effectiveDailyRate)}/day effective`}
          />
          <Row
            icon={<RotateCcw className="h-4 w-4 text-emerald-600" />}
            label="Refundable on return"
            value={inr(quote.refundAmount)}
            hint="Deposit minus rental fee, credited after seller inspection"
            strong
          />
        </dl>

        <div className="mt-3 rounded-xl border border-dashed border-brand-200 bg-brand-50/60 p-3 text-xs text-brand-900">
          <p className="flex items-center gap-1.5 font-bold">
            <Sparkles className="h-3.5 w-3.5" /> Reimbursement clause
          </p>
          <p className="mt-1 leading-relaxed">
            Once returned and verified by the seller, {inr(quote.deposit)} − {inr(quote.rentalFee)} rental fee
            {quote.penaltyAmount ? ` − ${inr(quote.penaltyAmount)} damage penalty` : ""} ={" "}
            <strong>{inr(quote.refundAmount)}</strong> refunded to your original payment method or the Bookart wallet.
            Late returns accrue 10% of the daily rate per day.
          </p>
        </div>

        <ol className="mt-3 space-y-1.5 text-[11px] text-ink-500">
          <Step n={1} label={`Pay ${inr(quote.deposit)} deposit + ${inr(quote.rentalFee)} fee`} />
          <Step n={2} label={`Read for ${days} days · due ${new Date(Date.now() + days * 864e5).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`} />
          <Step n={3} label="Request return, hand over / courier back to seller" />
          <Step n={4} label="Seller inspects condition → refund reaches you in 24–48 h" />
        </ol>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" full disabled={!available} onClick={() => addToCart(product.id, "rent", days)}>
            <ShoppingCart className="h-4 w-4" /> Add rental to cart
          </Button>
          <Button full disabled={!available} loading={busy} onClick={handleRent}>
            Rent now · {inr(quote.deposit)}
          </Button>
        </div>

        {result ? (
          <div
            className={cn(
              "mt-3 rounded-xl p-3 text-xs",
              result.ok ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
            )}
          >
            <p className="font-semibold">{result.ok ? "Rental confirmed" : "Couldn't complete"}</p>
            <p className="mt-0.5">{result.message}</p>
            {result.ok ? (
              <Link href="/rentals" className="mt-2 inline-block font-bold underline">
                View in My Rentals →
              </Link>
            ) : (
              <Link href="/login" className="mt-2 inline-block font-bold underline">
                Sign in →
              </Link>
            )}
          </div>
        ) : null}

        <p className="mt-3 flex items-start gap-1.5 text-[11px] text-ink-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Deposit is refunded only after the seller verifies the returned copy. Damage penalties follow the Bookart
          grading scale (0% / 10% / 35% / 100%).
        </p>
      </div>
    </Card>
  );
}

function Row({
  icon,
  label,
  value,
  hint,
  strong,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-0.5">{icon}</span>
        <span className="min-w-0">
          <dt className={cn("text-xs", strong ? "font-bold text-ink-900" : "font-semibold text-ink-700")}>{label}</dt>
          {hint ? <dd className="text-[11px] text-ink-500">{hint}</dd> : null}
        </span>
      </div>
      <span className={cn("shrink-0 tabular-nums", strong ? "text-base font-extrabold text-ink-900" : "text-sm font-bold text-ink-700")}>
        {value}
      </span>
    </div>
  );
}

function Step({ n, label }: { n: number; label: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700">
        {n}
      </span>
      <span>{label}</span>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Seller trust card                                                   */
/* ------------------------------------------------------------------ */

export function SellerCard({ product }: { product: ProductWithDistance }) {
  const seller = product.seller;
  if (!seller) return null;
  return (
    <Card className="p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Sold by</p>
      <div className="mt-2 flex items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-base font-bold text-white"
          style={{ backgroundColor: seller.avatarColor }}
        >
          {seller.name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold text-ink-900">
            {seller.name}
            {seller.verifiedSeller ? <BadgeCheck className="h-4 w-4 text-brand-600" /> : null}
          </p>
          <p className="text-xs text-ink-500">
            {seller.sellerKind === "bookstore"
              ? "Registered bookstore"
              : seller.sellerKind === "library"
                ? "Registered lending library"
                : `${seller.occupation} · Individual seller`}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
            <span className="font-semibold text-amber-600">★ {seller.rating.toFixed(1)}</span>
            <span>({seller.ratingsCount} ratings)</span>
            <span>·</span>
            <span>Member since {new Date(seller.createdAt).getFullYear()}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
          <p className="flex items-center gap-1 font-bold text-ink-700">
            <Wallet className="h-3 w-3" /> Payouts
          </p>
          <p className="text-ink-500">T+2 after handover</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
          <p className="flex items-center gap-1 font-bold text-ink-700">
            <CalendarClock className="h-3 w-3" /> Response
          </p>
          <p className="text-ink-500">Usually within 4 h</p>
        </div>
      </div>

      {seller.verification.gstin ? (
        <p className="mt-3 text-[11px] text-ink-500">
          GSTIN <span className="font-mono font-semibold text-ink-700">{seller.verification.gstin}</span>
        </p>
      ) : null}
      {seller.verification.registrationId ? (
        <p className="text-[11px] text-ink-500">
          Reg. ID <span className="font-mono font-semibold text-ink-700">{seller.verification.registrationId}</span>
        </p>
      ) : null}
    </Card>
  );
}
