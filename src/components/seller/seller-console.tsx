"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  BadgeIndianRupee,
  CheckCircle2,
  ClipboardCheck,
  Package,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Truck,
} from "lucide-react";
import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";
import { deleteListingAction, inspectRentalAction, toggleListingStatusAction } from "@/app/actions/marketplace";
import { ConditionBadge } from "@/components/domain/badges";
import { coverDataUri } from "@/lib/covers";
import { PENALTY_GRADES, inr, platformCommission, quoteRental } from "@/lib/rental";
import type { PenaltyGrade, Product, RentalOrder, User } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SellerListing extends Product {
  distanceKm: number | null;
}

export interface SellerRentalRow extends RentalOrder {
  product?: Product;
  buyer?: User;
  daysToDue: number;
}

export function ListingsTable({ listings }: { listings: SellerListing[] }) {
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState(listings);

  React.useEffect(() => setRows(listings), [listings]);

  const filtered = rows.filter((row) => {
    const matchesQuery = `${row.title} ${row.author} ${row.subject ?? ""}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  async function changeStatus(id: string, status: string) {
    setBusy(id);
    const res = await toggleListingStatusAction(id, status);
    setBusy(null);
    if (res.ok) setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status: status as Product["status"] } : row)));
  }

  async function remove(id: string) {
    setBusy(id);
    const res = await deleteListingAction(id);
    setBusy(null);
    if (res.ok) setRows((prev) => prev.filter((row) => row.id !== id));
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-ink-900">Your listings ({rows.length})</p>
          <p className="text-[11px] text-ink-500">Toggle availability when a copy is out on rent or sold.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a listing"
            className="h-9 w-44 pl-8 text-xs"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 w-32 py-0 text-xs">
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="rented">On rent</option>
          <option value="sold">Sold</option>
          <option value="draft">Draft</option>
        </Select>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-ink-500">
              <th className="py-2">Item</th>
              <th className="py-2">Condition</th>
              <th className="py-2 text-right">Buy price</th>
              <th className="py-2 text-right">Rent / day</th>
              <th className="py-2 text-right">Deposit</th>
              <th className="py-2 text-center">Status</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <tr key={row.id} className="align-middle">
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <Image
                      src={coverDataUri(row, "front")}
                      alt=""
                      width={48}
                      height={64}
                      unoptimized
                      className="h-12 w-9 rounded object-cover ring-1 ring-slate-200"
                    />
                    <div className="min-w-0">
                      <Link href={`/product/${row.id}`} className="line-clamp-1 font-semibold text-ink-900 hover:text-brand-700">
                        {row.title}
                      </Link>
                      <p className="text-[11px] text-ink-500">
                        {row.author} · {row.kind}
                        {row.isRentable ? " · rentable" : ""}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-2">
                  <ConditionBadge condition={row.condition} />
                </td>
                <td className="py-2 text-right font-semibold">{row.buyPrice ? inr(row.buyPrice) : "—"}</td>
                <td className="py-2 text-right">{row.rentalBaseRate ? inr(row.rentalBaseRate) : "—"}</td>
                <td className="py-2 text-right">
                  {row.isRentable ? inr(Math.round((row.buyPrice ?? row.mrp) * row.depositMultiplier)) : "—"}
                </td>
                <td className="py-2 text-center">
                  <Badge
                    tone={row.status === "available" ? "emerald" : row.status === "rented" ? "amber" : row.status === "sold" ? "rose" : "slate"}
                  >
                    {row.status}
                  </Badge>
                </td>
                <td className="py-2">
                  <div className="flex items-center justify-end gap-1.5">
                    <Select
                      className="h-8 w-28 py-0 text-[11px]"
                      value={row.status}
                      disabled={busy === row.id}
                      onChange={(e) => changeStatus(row.id, e.target.value)}
                      aria-label="Change status"
                    >
                      <option value="available">Available</option>
                      <option value="rented">On rent</option>
                      <option value="sold">Sold</option>
                      <option value="draft">Draft</option>
                    </Select>
                    <Button
                      size="iconSm"
                      variant="ghost"
                      aria-label="Delete listing"
                      loading={busy === row.id}
                      onClick={() => remove(row.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-sm text-ink-500">
                  No listings match. <Link href="/sell" className="font-bold text-brand-700 underline">List an item →</Link>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function RentalLedger({ rentals }: { rentals: SellerRentalRow[] }) {
  const [selected, setSelected] = React.useState<SellerRentalRow | null>(null);
  const [grade, setGrade] = React.useState<PenaltyGrade>("ok");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);

  const pending = rentals.filter((r) => r.status === "return_requested");
  const lateDaysFor = (row: SellerRentalRow) => (row.status === "overdue" ? Math.max(0, -row.daysToDue) : 0);
  const quoteFor = (row: SellerRentalRow) => {
    if (!row.product) return null;
    return quoteRental({
      product: row.product,
      days: row.days,
      lateDays: lateDaysFor(row),
      grade,
    });
  };

  async function settle() {
    if (!selected) return;
    setBusy(true);
    const res = await inspectRentalAction(selected.id, grade, notes);
    setBusy(false);
    setResult(
      res.ok
        ? {
            ok: true,
            message: `Refund of ${inr(res.refundAmount ?? 0)} released to the renter. ${PENALTY_GRADES.find((g) => g.grade === grade)?.description}`,
          }
        : { ok: false, message: res.error ?? "Inspection failed" },
    );
  }

  const quote = selected ? quoteFor(selected) : null;

  return (
    <div className="space-y-4">
      {pending.length ? (
        <Card className="border-amber-200 bg-amber-50/70 p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4" /> {pending.length} return{pending.length > 1 ? "s" : ""} awaiting your
            inspection
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Inspect the copy within 48 h of handover. The renter's deposit is released the moment you confirm the grade.
          </p>
        </Card>
      ) : null}

      <Card className="p-4">
        <p className="text-sm font-extrabold text-ink-900">Rental ledger ({rentals.length})</p>
        <p className="text-[11px] text-ink-500">
          Escrow view: deposits you're holding, fees earned and refunds still to be released.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-ink-500">
                <th className="py-2">Item</th>
                <th className="py-2">Renter</th>
                <th className="py-2">Tier</th>
                <th className="py-2 text-right">Deposit held</th>
                <th className="py-2 text-right">Fee earned</th>
                <th className="py-2 text-center">Status</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rentals.map((row) => (
                <tr key={row.id}>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      {row.product ? (
                        <Image
                          src={coverDataUri(row.product, "front")}
                          alt=""
                          width={48}
                          height={64}
                          unoptimized
                          className="h-12 w-9 rounded object-cover ring-1 ring-slate-200"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-semibold text-ink-900">{row.product?.title ?? "Removed"}</p>
                        <p className="text-[11px] text-ink-500">#{row.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2">{row.buyer?.name ?? "—"}</td>
                  <td className="py-2">
                    <Badge tone="slate">{row.tierLabel}</Badge>
                    <p className="mt-1 text-[10px] text-ink-500">
                      due {new Date(row.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {row.status === "overdue" ? ` · ${Math.abs(row.daysToDue)}d late` : ""}
                    </p>
                  </td>
                  <td className="py-2 text-right font-semibold">{inr(row.depositPaid)}</td>
                  <td className="py-2 text-right text-cash-600">{inr(row.rentalFee)}</td>
                  <td className="py-2 text-center">
                    <Badge
                      tone={
                        row.status === "active"
                          ? "brand"
                          : row.status === "return_requested"
                            ? "amber"
                            : row.status === "overdue"
                              ? "rose"
                              : "emerald"
                      }
                    >
                      {row.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="py-2 text-right">
                    {row.status === "return_requested" || row.status === "overdue" ? (
                      <Button size="sm" onClick={() => { setSelected(row); setGrade("ok"); setNotes(""); setResult(null); }}>
                        <ClipboardCheck className="h-3.5 w-3.5" /> Inspect
                      </Button>
                    ) : (
                      <Link href={`/product/${row.productId}`} className="text-[11px] font-bold text-brand-700 hover:underline">
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {!rentals.length ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-ink-500">
                    No rentals yet. Enable renting on a listing to start earning per-day fees.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && quote ? (
        <Card className="border-brand-200 p-4">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-ink-900">
            <ShieldCheck className="h-4 w-4 text-brand-600" /> Inspection & refund calculator — {selected.product?.title}
          </p>

          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Grade the returned copy</p>
              <div className="mt-2 space-y-2">
                {PENALTY_GRADES.map((option) => (
                  <button
                    key={option.grade}
                    type="button"
                    onClick={() => setGrade(option.grade)}
                    className={cn(
                      "w-full rounded-xl border p-2.5 text-left transition",
                      grade === option.grade ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20" : "border-slate-200 hover:border-brand-300",
                    )}
                  >
                    <p className="flex items-center justify-between text-xs font-bold text-ink-900">
                      {option.label}
                      <span className={option.pct === 0 ? "text-emerald-600" : "text-rose-600"}>
                        −{Math.round(option.pct * 100)}%
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-500">{option.description}</p>
                  </button>
                ))}
              </div>

              <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-ink-500">Inspection notes (visible to renter)</p>
              <Textarea
                className="mt-1.5 min-h-20 text-sm"
                placeholder="e.g. Pencil notes added on 12 pages; light coffee stain on back cover."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Settlement preview</p>
                <table className="mt-2 w-full text-xs">
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-1.5">Deposit held</td>
                      <td className="py-1.5 text-right font-bold">{inr(selected.depositPaid)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5">Rental fee → you</td>
                      <td className="py-1.5 text-right font-bold text-cash-600">{inr(selected.rentalFee)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5">Damage penalty → you</td>
                      <td className="py-1.5 text-right font-bold text-rose-600">{inr(quote.penaltyAmount)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5">Late fee ({lateDaysFor(selected)}d) → you</td>
                      <td className="py-1.5 text-right font-bold text-amber-600">{inr(quote.lateFee)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 font-semibold">Refund to renter</td>
                      <td className="py-1.5 text-right text-base font-extrabold text-emerald-700">
                        {inr(quote.refundAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-2 text-[10px] text-ink-500">
                  Platform commission on the rental fee: {inr(platformCommission(selected.rentalFee, "rental"))} (12%).
                </p>
              </div>

              <Button full className="mt-3" loading={busy} onClick={settle}>
                <CheckCircle2 className="h-4 w-4" /> Confirm inspection & release refund
              </Button>
              <Button variant="ghost" full className="mt-2" onClick={() => setSelected(null)}>
                Cancel
              </Button>

              {result ? (
                <p
                  className={cn(
                    "mt-2 rounded-xl p-2.5 text-[11px] font-semibold",
                    result.ok ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
                  )}
                >
                  {result.message}
                </p>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Payout summary</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
            <p className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
              <BadgeIndianRupee className="h-3.5 w-3.5" /> Settled to wallet
            </p>
            <p className="mt-0.5 text-lg font-extrabold text-emerald-900">
              {inr(rentals.filter((r) => r.status === "refunded").reduce((s, r) => s + r.rentalFee + r.penaltyAmount, 0))}
            </p>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-200">
            <p className="flex items-center gap-1 text-[11px] font-bold text-brand-800">
              <ShieldCheck className="h-3.5 w-3.5" /> Deposits in escrow
            </p>
            <p className="mt-0.5 text-lg font-extrabold text-brand-900">
              {inr(
                rentals
                  .filter((r) => ["active", "overdue", "return_requested"].includes(r.status))
                  .reduce((s, r) => s + r.depositPaid, 0),
              )}
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
            <p className="flex items-center gap-1 text-[11px] font-bold text-amber-800">
              <TrendingUp className="h-3.5 w-3.5" /> Awaiting payout
            </p>
            <p className="mt-0.5 text-lg font-extrabold text-amber-900">
              {inr(rentals.filter((r) => r.status === "return_requested" || r.status === "overdue").reduce((s, r) => s + r.rentalFee, 0))}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function SalesPanel({
  sales,
}: {
  sales: { id: string; amount: number; courierFee: number; status: string; createdAt: string; buyer?: User; product?: Product }[];
}) {
  const gross = sales.reduce((s, o) => s + o.amount + o.courierFee, 0);
  const commission = sales.reduce((s, o) => s + platformCommission(o.amount, "sale"), 0);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-extrabold text-ink-900">Sold items ({sales.length})</p>
          <p className="text-[11px] text-ink-500">
            Gross {inr(gross)} · Bookart commission {inr(commission)} (5%) · net {inr(gross - commission)}
          </p>
        </div>
        <Badge tone="emerald" icon={<Package className="h-3 w-3" />}>
          T+2 payouts
        </Badge>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-ink-500">
              <th className="py-2">Item</th>
              <th className="py-2">Buyer</th>
              <th className="py-2">Mode</th>
              <th className="py-2 text-right">Amount</th>
              <th className="py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="py-2">
                  <p className="line-clamp-1 font-semibold text-ink-900">{sale.product?.title ?? "Removed"}</p>
                  <p className="text-[11px] text-ink-500">
                    {new Date(sale.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </td>
                <td className="py-2">{sale.buyer?.name ?? "—"}</td>
                <td className="py-2">
                  <Badge tone="slate">
                    <Truck className="h-3 w-3" /> {sale.courierFee ? "Courier" : "Pickup"}
                  </Badge>
                </td>
                <td className="py-2 text-right font-semibold">{inr(sale.amount + sale.courierFee)}</td>
                <td className="py-2 text-center">
                  <Badge tone={sale.status === "delivered" ? "emerald" : "brand"}>{sale.status.replace(/_/g, " ")}</Badge>
                </td>
              </tr>
            ))}
            {!sales.length ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-ink-500">
                  No sales yet — share your listing link with nearby students.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-500">
        <RotateCcw className="h-3.5 w-3.5" /> Returns within 3 days of handover are refunded from escrow without
        affecting your payout on delivered items.
      </p>
    </Card>
  );
}
