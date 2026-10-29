"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Banknote,
  CreditCard,
  Loader2,
  MapPin,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Truck,
  Wallet,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, Input, Label, RadioTile, Textarea } from "@/components/ui";
import { useCart } from "@/components/domain/use-cart";
import { productsByIdsAction, checkoutAction } from "@/app/actions/marketplace";
import { coverDataUri } from "@/lib/covers";
import { inr, quoteRental } from "@/lib/rental";
import { useLocationStore } from "@/store/location-store";
import { useCartStore } from "@/store/cart-store";
import type { ProductWithDistance, SessionUser } from "@/lib/types";

export function CheckoutClient({ user }: { user: SessionUser | null }) {
  const { lines, removeFromCart } = useCart();
  const clear = useCartStore((s) => s.clear);
  const { latitude, longitude } = useLocationStore();
  const [products, setProducts] = React.useState<ProductWithDistance[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [address, setAddress] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<"upi" | "card" | "cod" | "wallet">("upi");
  const [deliveryMode, setDeliveryMode] = React.useState<"pickup" | "courier">("pickup");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<
    | { ok: true; purchaseIds: string[]; rentalIds: string[]; message?: string; walletBalance?: number; deposit: number; fee: number; refund: number }
    | { ok: false; error: string }
    | null
  >(null);
  const router = useRouter();

  React.useEffect(() => {
    const ids = lines.map((l) => l.productId);
    if (!ids.length) {
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
      return { line, product, quote: quoteRental({ product, days: line.days ?? 7 }) };
    })
    .filter(Boolean) as { line: (typeof lines)[number]; product: ProductWithDistance; quote: ReturnType<typeof quoteRental> }[];

  const buyTotal = rows.filter((r) => r.line.mode === "buy").reduce((s, r) => s + (r.product.buyPrice ?? r.product.mrp), 0);
  const deposits = rows.filter((r) => r.line.mode === "rent").reduce((s, r) => s + r.quote.deposit, 0);
  const fees = rows.filter((r) => r.line.mode === "rent").reduce((s, r) => s + r.quote.rentalFee, 0);
  const courierFee = deliveryMode === "courier" && rows.some((r) => r.line.mode === "buy") ? 49 : 0;
  const grandTotal = buyTotal + deposits + courierFee;

  async function placeOrder() {
    if (!user) {
      router.push("/login?next=/checkout");
      return;
    }
    setBusy(true);
    const res = await checkoutAction({
      lines: lines.map((l) => ({ productId: l.productId, mode: l.mode, days: l.days })),
      address: address || "Pickup at seller location",
      paymentMethod,
      deliveryMode,
    });
    setBusy(false);
    if (res.ok) {
      setResult({
        ok: true,
        purchaseIds: res.purchaseIds,
        rentalIds: res.rentalIds,
        message: res.message,
        walletBalance: res.walletBalance,
        deposit: deposits,
        fee: fees,
        refund: deposits - fees,
      });
      clear();
      router.refresh();
    } else {
      setResult({ ok: false, error: res.error ?? "Checkout failed" });
    }
  }

  if (result?.ok) {
    return (
      <Card className="mx-auto max-w-2xl p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <BadgeCheck className="h-7 w-7" />
          </span>
          <h2 className="font-serif text-2xl font-bold text-ink-900">Order confirmed</h2>
          <p className="max-w-md text-sm text-ink-600">{result.message}</p>
        </div>

        {result.deposit > 0 ? (
          <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50/70 p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold text-brand-900">
              <ShieldCheck className="h-4 w-4" /> Deposit & refund summary
            </p>
            <table className="mt-2 w-full text-xs text-brand-900">
              <tbody className="divide-y divide-brand-200/70">
                <tr>
                  <td className="py-1.5">Security deposit held in escrow</td>
                  <td className="py-1.5 text-right font-bold">{inr(result.deposit)}</td>
                </tr>
                <tr>
                  <td className="py-1.5">Rental fee paid to the seller</td>
                  <td className="py-1.5 text-right font-bold">− {inr(result.fee)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-semibold">Refundable on verified return</td>
                  <td className="py-1.5 text-right text-base font-extrabold">{inr(result.refund)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {result.rentalIds.length ? (
            <Link href="/rentals">
              <Button>Track rentals & deposits</Button>
            </Link>
          ) : null}
          <Link href="/orders">
            <Button variant="outline">View orders</Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="ghost">Keep browsing</Button>
          </Link>
        </div>
        {result.walletBalance !== undefined ? (
          <p className="mt-3 text-center text-xs text-ink-500">Wallet balance: {inr(result.walletBalance)}</p>
        ) : null}
      </Card>
    );
  }

  if (!loading && !rows.length) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-6 w-6" />}
        title="Nothing to check out"
        description="Your cart is empty. Add a book to buy or rent one for the semester."
        action={
          <Link href="/marketplace">
            <Button>Browse listings</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <Card className="p-4">
          <p className="text-sm font-extrabold text-ink-900">1 · Delivery or pickup</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <RadioTile
              checked={deliveryMode === "pickup"}
              onChange={() => setDeliveryMode("pickup")}
              title="Local pickup"
              subtitle="Free · meet the seller, inspect the copy before you pay the balance"
              icon={<MapPin className="h-4 w-4 text-brand-600" />}
            />
            <RadioTile
              checked={deliveryMode === "courier"}
              onChange={() => setDeliveryMode("courier")}
              title="Courier delivery"
              subtitle="₹49 flat · anywhere in India, 3–5 days"
              icon={<Truck className="h-4 w-4 text-amber-600" />}
            />
          </div>

          <div className="mt-4">
            <Label htmlFor="address">Pickup point / delivery address</Label>
            <Textarea
              id="address"
              className="min-h-20"
              placeholder={user?.city ? `${user.city} ${user.pincode}` : "House, street, area, city, pincode"}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            {user ? (
              <p className="mt-1.5 text-[11px] text-ink-500">
                Signed in as {user.name} · {user.email}. Saved address: {user.city ?? "—"} {user.pincode ?? ""}
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-extrabold text-ink-900">2 · Payment method</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <RadioTile
              checked={paymentMethod === "upi"}
              onChange={() => setPaymentMethod("upi")}
              title="UPI / QR"
              subtitle="GPay, PhonePe, Paytm — instant confirmation"
              icon={<QrCode className="h-4 w-4 text-brand-600" />}
            />
            <RadioTile
              checked={paymentMethod === "card"}
              onChange={() => setPaymentMethod("card")}
              title="Card"
              subtitle="Visa, Mastercard, RuPay · 3-D Secure"
              icon={<CreditCard className="h-4 w-4 text-brand-600" />}
            />
            <RadioTile
              checked={paymentMethod === "wallet"}
              onChange={() => setPaymentMethod("wallet")}
              title={`Bookart wallet · ${inr(user?.walletBalance ?? 0)}`}
              subtitle="Instant refunds land here first"
              icon={<Wallet className="h-4 w-4 text-emerald-600" />}
            />
            <RadioTile
              checked={paymentMethod === "cod"}
              onChange={() => setPaymentMethod("cod")}
              title="Cash on pickup"
              subtitle="Purchases only — deposits always require prepayment"
              icon={<Banknote className="h-4 w-4 text-amber-600" />}
              disabled={deposits > 0}
            />
          </div>
          {deposits > 0 ? (
            <p className="mt-2 rounded-xl bg-amber-50 p-2.5 text-[11px] text-amber-800 ring-1 ring-amber-200">
              Your cart has {inr(deposits)} of refundable deposits. Deposits must be prepaid (UPI / card / wallet) — COD
              isn't available for rentals.
            </p>
          ) : null}
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-500">
            <Smartphone className="h-3.5 w-3.5" /> Demo build — no real payment gateway is contacted. Wallet debits are
            simulated against the seeded balance.
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-extrabold text-ink-900">3 · Review items ({rows.length})</p>
          <ul className="mt-3 space-y-3">
            {rows.map(({ line, product, quote }) => (
              <li key={`${line.productId}-${line.mode}`} className="flex gap-3">
                <Image
                  src={coverDataUri(product, "front")}
                  alt=""
                  width={80}
                  height={110}
                  unoptimized
                  className="h-20 w-14 rounded-lg object-cover ring-1 ring-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-bold text-ink-900">{product.title}</p>
                  <p className="text-xs text-ink-500">
                    {product.seller?.name} · {product.pickupArea}, {product.pickupCity}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone={line.mode === "rent" ? "cash" : "dark"}>
                      {line.mode === "rent" ? `Rental · ${line.days ?? 7} days` : "Purchase"}
                    </Badge>
                    {line.mode === "rent" ? <Badge tone="brand">Deposit {inr(quote.deposit)}</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <p className="text-sm font-extrabold text-ink-900">
                    {inr(line.mode === "rent" ? quote.deposit : product.buyPrice ?? product.mrp)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFromCart(product.id, line.mode)}
                    className="text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="space-y-3 lg:sticky lg:top-36 lg:self-start">
        <Card className="p-4">
          <p className="text-sm font-extrabold text-ink-900">Order total</p>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Purchases" value={inr(buyTotal)} />
            <Row label="Refundable deposits" value={inr(deposits)} />
            <Row label="Rental fees" value={inr(fees)} />
            <Row label="Courier" value={courierFee ? inr(courierFee) : "Free"} />
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <dt className="font-bold text-ink-900">Pay now</dt>
              <dd className="text-lg font-extrabold text-ink-900">{inr(grandTotal)}</dd>
            </div>
          </dl>

          {deposits > 0 ? (
            <p className="mt-3 rounded-xl bg-brand-50 p-2.5 text-[11px] text-brand-900">
              Of this, <strong>{inr(deposits - fees)}</strong> is refundable once the returned copies pass seller
              inspection.
            </p>
          ) : null}

          <Button full className="mt-3" variant="cash" loading={busy} onClick={placeOrder}>
            {user ? `Place order · ${inr(grandTotal)}` : "Sign in to place order"}
          </Button>

          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-ink-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Deposits are held by Bookart in escrow and released only after the seller verifies the return. Rental fees
            are settled to the seller at T+2.
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">If you exceed the due date</p>
          <p className="mt-1.5 text-[11px] text-ink-600">
            Late fee = 10% of the daily rental rate × overdue days, capped at 60% of the deposit. Extensions can be
            requested from My Rentals before the due date.
          </p>
        </Card>
      </div>

      {result && !result.ok ? (
        <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 lg:col-span-2">
          {result.error}
        </p>
      ) : null}
      {loading ? (
        <p className="flex items-center gap-2 text-xs text-ink-500 lg:col-span-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Validating prices against live listings…
        </p>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-600">{label}</dt>
      <dd className="font-semibold text-ink-900">{value}</dd>
    </div>
  );
}
