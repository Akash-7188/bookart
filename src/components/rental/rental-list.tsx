"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, CalendarClock, IndianRupee, RotateCcw, ShieldCheck, Timer } from "lucide-react";
import { Badge, Button, Card, ProgressBar } from "@/components/ui";
import { requestReturnAction } from "@/app/actions/marketplace";
import { coverDataUri } from "@/lib/covers";
import { inr, quoteRental } from "@/lib/rental";
import type { RentalOrder, Product, User } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface BuyerRentalRow extends RentalOrder {
  product?: Product;
  seller?: User;
  daysToDue: number;
}

const STATUS_META: Record<
  RentalOrder["status"],
  { label: string; tone: "brand" | "emerald" | "amber" | "rose" | "slate" | "cash" }
> = {
  active: { label: "Active rental", tone: "brand" },
  return_requested: { label: "Return requested", tone: "amber" },
  returned_inspected: { label: "Inspected", tone: "sky" as never },
  refunded: { label: "Refunded", tone: "emerald" },
  overdue: { label: "Overdue", tone: "rose" },
  cancelled: { label: "Cancelled", tone: "slate" },
};

export function RentalList({ rentals }: { rentals: BuyerRentalRow[] }) {
  const [pending, setPending] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<Record<string, string>>({});

  async function requestReturn(id: string) {
    setPending(id);
    const res = await requestReturnAction(id);
    setPending(null);
    setMessage((prev) => ({
      ...prev,
      [id]: res.ok ? "Return requested — the seller has been notified to inspect the copy." : res.error ?? "Failed",
    }));
  }

  return (
    <div className="space-y-4">
      {rentals.map((rental) => {
        const product = rental.product;
        const meta = STATUS_META[rental.status];
        const totalDays = Math.max(
          1,
          Math.round((Date.parse(rental.dueDate) - Date.parse(rental.startDate)) / 86_400_000),
        );
        const elapsed = Math.max(
          0,
          Math.min(totalDays, Math.round((Date.now() - Date.parse(rental.startDate)) / 86_400_000)),
        );
        const quote = product ? quoteRental({ product, days: rental.days }) : null;
        const lateDays = rental.status === "overdue" ? Math.max(0, -rental.daysToDue) : 0;

        return (
          <Card key={rental.id} className="overflow-hidden">
            <div className="flex flex-wrap items-start gap-4 p-4">
              {product ? (
                <Link href={`/product/${product.id}`} className="shrink-0">
                  <Image
                    src={coverDataUri(product, "front")}
                    alt=""
                    width={120}
                    height={160}
                    unoptimized
                    className="h-28 w-20 rounded-lg object-cover ring-1 ring-slate-200"
                  />
                </Link>
              ) : null}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <span className="text-[11px] text-ink-500">#{rental.id}</span>
                  <Badge tone="slate">{rental.tierLabel}</Badge>
                </div>

                <Link href={product ? `/product/${product.id}` : "#"} className="mt-1.5 block">
                  <p className="text-sm font-bold text-ink-900 hover:text-brand-700">{product?.title ?? "Listing removed"}</p>
                </Link>
                <p className="text-xs text-ink-500">
                  {product?.author} · rented from {rental.seller?.name}
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Money label="Deposit paid" value={inr(rental.depositPaid)} tone="brand" icon={<ShieldCheck className="h-3.5 w-3.5" />} />
                  <Money label="Rental fee" value={inr(rental.rentalFee)} tone="cash" icon={<IndianRupee className="h-3.5 w-3.5" />} />
                  <Money
                    label={rental.status === "refunded" ? "Refunded to you" : "Refundable on return"}
                    value={inr(rental.status === "refunded" ? rental.refundAmount : (quote?.refundAmount ?? rental.depositPaid - rental.rentalFee))}
                    tone="emerald"
                    icon={<RotateCcw className="h-3.5 w-3.5" />}
                  />
                </div>

                {rental.status !== "refunded" ? (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-ink-600">
                      <span>
                        Started {new Date(rental.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                      <span>
                        Due {new Date(rental.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <ProgressBar
                      value={(elapsed / totalDays) * 100}
                      tone={rental.status === "overdue" ? "amber" : elapsed / totalDays > 0.8 ? "amber" : "brand"}
                    />
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-500">
                      <CalendarClock className="h-3 w-3" />
                      {rental.daysToDue >= 0
                        ? `${rental.daysToDue} day${rental.daysToDue === 1 ? "" : "s"} left`
                        : `${Math.abs(rental.daysToDue)} day(s) overdue`}
                      {lateDays > 0 && product?.rentalBaseRate
                        ? ` · late fee accruing at ${inr(Math.round(product.rentalBaseRate * 0.1))}/day`
                        : ""}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-[11px] text-emerald-800 ring-1 ring-emerald-200">
                    Refund of {inr(rental.refundAmount)} credited to your {rental.refundMethod === "wallet" ? "Bookart wallet" : "original payment method"} on{" "}
                    {rental.refundedAt ? new Date(rental.refundedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                    {rental.penaltyAmount > 0 ? ` after a ${inr(rental.penaltyAmount)} damage deduction` : ""}.
                  </p>
                )}

                {rental.inspectionNotes ? (
                  <p className="mt-2 flex items-start gap-1.5 text-[11px] text-ink-600">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    Seller note: {rental.inspectionNotes}
                  </p>
                ) : null}

                <ol className="mt-3 space-y-1 border-l-2 border-dashed border-slate-200 pl-3">
                  {rental.timeline.slice(-4).map((entry, i) => (
                    <li key={`${entry.at}-${i}`} className="text-[11px] text-ink-500">
                      <span className="font-semibold text-ink-700">
                        {new Date(entry.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>{" "}
                      — {entry.label}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-40">
                {(rental.status === "active" || rental.status === "overdue") && (
                  <Button
                    size="sm"
                    full
                    loading={pending === rental.id}
                    onClick={() => requestReturn(rental.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Request return
                  </Button>
                )}
                {rental.status === "return_requested" ? (
                  <p className="rounded-lg bg-amber-50 p-2 text-center text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                    Waiting for seller inspection
                  </p>
                ) : null}
                {product ? (
                  <Link href={`/product/${product.id}`} className="w-full">
                    <Button size="sm" variant="outline" full>
                      View listing
                    </Button>
                  </Link>
                ) : null}
                <p className="flex items-center gap-1 text-[10px] text-ink-500">
                  <Timer className="h-3 w-3" /> Deposit in escrow
                </p>
                {message[rental.id] ? (
                  <p className="text-[11px] font-semibold text-brand-700">{message[rental.id]}</p>
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Money({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "brand" | "cash" | "emerald";
  icon: React.ReactNode;
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700 ring-brand-200",
    cash: "bg-amber-50 text-amber-700 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  return (
    <div className={cn("rounded-xl p-2.5 ring-1", tones[tone])}>
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-extrabold">{value}</p>
    </div>
  );
}
