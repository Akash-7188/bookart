"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Info, ShieldCheck, ShoppingBag, Trash2 } from "lucide-react";
import { Button, Sheet } from "@/components/ui";
import { useCart } from "@/components/domain/use-cart";
import { useCartStore } from "@/store/cart-store";
import { productsByIdsAction } from "@/app/actions/marketplace";
import { coverDataUri } from "@/lib/covers";
import { quoteRental, inr } from "@/lib/rental";
import { RENT_TIERS } from "@/lib/rental";
import { useLocationStore } from "@/store/location-store";
import type { ProductWithDistance } from "@/lib/types";

export function CartDrawer() {
  const { lines, removeFromCart, updateDays } = useCart();
  const isOpen = useCartStore((s) => s.isOpen);
  const open = useCartStore((s) => s.open);
  const close = useCartStore((s) => s.close);
  const { latitude, longitude } = useLocationStore();
  const [products, setProducts] = React.useState<ProductWithDistance[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    if (!isOpen) return;
    const ids = lines.map((l) => l.productId);
    if (!ids.length) {
      setProducts([]);
      return;
    }
    setLoading(true);
    productsByIdsAction(ids, { latitude, longitude })
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [isOpen, lines, latitude, longitude]);

  const rows = lines
    .map((line) => {
      const product = products.find((p) => p.id === line.productId);
      if (!product) return null;
      const quote = quoteRental({ product, days: line.days ?? 7 });
      return {
        line,
        product,
        amount: line.mode === "rent" ? quote.deposit : product.buyPrice ?? product.mrp,
        deposit: line.mode === "rent" ? quote.deposit : 0,
        fee: line.mode === "rent" ? quote.rentalFee : 0,
        refund: line.mode === "rent" ? quote.refundAmount : 0,
      };
    })
    .filter(Boolean) as {
    line: (typeof lines)[number];
    product: ProductWithDistance;
    amount: number;
    deposit: number;
    fee: number;
    refund: number;
  }[];

  const payable = rows.reduce((sum, r) => sum + r.amount, 0);
  const deposits = rows.reduce((sum, r) => sum + r.deposit, 0);
  const fees = rows.reduce((sum, r) => sum + r.fee, 0);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="relative inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold text-ink-700 transition hover:bg-brand-50"
        aria-label="Open cart"
      >
        <ShoppingBag className="h-5 w-5" />
        <span className="hidden sm:inline">Cart</span>
        {lines.length ? (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-cash-500 px-1 text-[11px] font-extrabold text-ink-900">
            {lines.length}
          </span>
        ) : null}
      </button>

      <Sheet
        open={isOpen}
        onClose={close}
        title={`Your cart (${lines.length})`}
        description="Buy outright or start a rental with a refundable deposit."
        footer={
          rows.length ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-ink-700">Payable now</span>
                <span className="text-lg font-extrabold text-ink-900">{inr(payable)}</span>
              </div>
              {deposits > 0 ? (
                <p className="flex items-start gap-1.5 rounded-lg bg-brand-50 p-2 text-[11px] text-brand-800">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Includes {inr(deposits)} refundable deposit. Rental fees of {inr(fees)} are earned by the seller; the
                  rest returns to you after inspection.
                </p>
              ) : null}
              <Button
                full
                onClick={() => {
                  close();
                  router.push("/checkout");
                }}
              >
                Proceed to checkout
              </Button>
            </div>
          ) : null
        }
      >
        {loading && !rows.length ? (
          <p className="py-10 text-center text-sm text-ink-500">Loading your cart…</p>
        ) : null}

        {!loading && !rows.length ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <ShoppingBag className="h-6 w-6" />
            </span>
            <div>
              <p className="font-bold text-ink-900">Your cart is empty</p>
              <p className="mt-1 text-sm text-ink-500">
                Add a textbook to buy, or start a rental with a fully refundable deposit.
              </p>
            </div>
            <Link href="/marketplace" onClick={close} className="text-sm font-bold text-brand-700 underline">
              Browse nearby listings →
            </Link>
          </div>
        ) : null}

        <ul className="space-y-3">
          {rows.map(({ line, product, amount, deposit, fee, refund }) => (
            <li key={`${line.productId}-${line.mode}`} className="flex gap-3 rounded-xl border border-slate-200 p-2.5">
              <Link href={`/product/${product.id}`} onClick={close} className="shrink-0">
                <Image
                  src={coverDataUri(product, "front")}
                  alt=""
                  width={100}
                  height={134}
                  unoptimized
                  className="h-20 w-15 rounded-lg object-cover ring-1 ring-slate-200"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/product/${product.id}`} onClick={close} className="min-w-0">
                    <p className="line-clamp-2 text-sm font-bold text-ink-900">{product.title}</p>
                    <p className="truncate text-xs text-ink-500">{product.author}</p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeFromCart(product.id, line.mode)}
                    className="rounded-lg p-1 text-ink-500 transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {line.mode === "rent" ? (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex flex-wrap gap-1">
                      {RENT_TIERS.map((tier) => (
                        <button
                          key={tier.days}
                          type="button"
                          onClick={() => updateDays(product.id, tier.days)}
                          className={
                            "rounded-full border px-2 py-0.5 text-[11px] font-semibold transition " +
                            ((line.days ?? 7) === tier.days
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-slate-200 text-ink-600 hover:border-brand-300")
                          }
                        >
                          {tier.label.replace("1 semester / ", "")}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-ink-500">
                      Deposit <strong className="text-ink-900">{inr(deposit)}</strong> · fee{" "}
                      <strong className="text-ink-900">{inr(fee)}</strong> · refundable{" "}
                      <strong className="text-emerald-700">{inr(refund)}</strong>
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-ink-500">One-time purchase · pickup or courier</p>
                )}

                <p className="mt-2 text-sm font-extrabold text-ink-900">
                  {inr(amount)} <span className="text-[11px] font-semibold text-ink-500">{line.mode === "rent" ? "deposit" : "total"}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>

        {rows.length ? (
          <p className="mt-4 flex items-start gap-1.5 text-[11px] text-ink-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Prices are re-validated at checkout against live listings. Deposits sit in Bookart escrow until the seller
            verifies the returned item.
          </p>
        ) : null}
      </Sheet>
    </>
  );
}


