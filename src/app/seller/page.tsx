import Link from "next/link";
import { AlertTriangle, BookMarked, IndianRupee, LayoutDashboard, Plus, Repeat, ShieldCheck, Star, Store } from "lucide-react";
import { Badge, Button, Card, EmptyState, SectionHeader, Stat } from "@/components/ui";
import { ListingsTable, RentalLedger, SalesPanel } from "@/components/seller/seller-console";
import { listingsBySeller, rentalsForSeller, salesForSeller } from "@/lib/db";
import {
  hostedListingsBySeller,
  hostedRentalsForSeller,
  hostedSalesForSeller,
  isSupabaseConfigured,
} from "@/lib/hosted-data";
import { getCurrentUser } from "@/lib/session";
import { inr, platformCommission } from "@/lib/rental";
import { SELLER_KIND_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seller dashboard" };

export default async function SellerDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<Store className="h-6 w-6" />}
          title="Sign in to open your seller dashboard"
          description="Track listings, live rentals, deposits held in escrow and payouts."
          action={
            <Link href="/login?next=/seller">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const [listings, rentals, sales] = isSupabaseConfigured()
    ? await Promise.all([
        hostedListingsBySeller(user.id).then((result) => result.items),
        hostedRentalsForSeller(user.id),
        hostedSalesForSeller(user.id),
      ])
    : [
        listingsBySeller(user.id).items,
        rentalsForSeller(user.id),
        salesForSeller(user.id),
      ];

  const activeRentals = rentals.filter((r) => ["active", "overdue", "return_requested"].includes(r.status));
  const escrow = activeRentals.reduce((s, r) => s + r.depositPaid, 0);
  const grossSales = sales.reduce((s, o) => s + o.amount + o.courierFee, 0);
  const commission = sales.reduce((s, o) => s + platformCommission(o.amount, "sale"), 0);
  const rentalIncome = rentals.filter((r) => r.status === "refunded").reduce((s, r) => s + r.rentalFee + r.penaltyAmount, 0);
  const pending = rentals.filter((r) => r.status === "return_requested").length;
  const available = listings.filter((l) => l.status === "available").length;

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-5">
      <SectionHeader
        title="Seller dashboard"
        description="Listings, incoming rentals, escrow and payouts — everything in one place."
        action={
          <div className="flex gap-2">
            <Link href="/sell">
              <Button size="sm">
                <Plus className="h-4 w-4" /> New listing
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button size="sm" variant="outline">
                View storefront
              </Button>
            </Link>
          </div>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="grid h-11 w-11 place-items-center rounded-2xl text-lg font-bold text-white"
              style={{ backgroundColor: user.avatarColor }}
            >
              {user.name.slice(0, 1)}
            </span>
            <div>
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink-900">
                {user.name}
                <Badge tone={user.verifiedSeller ? "emerald" : "amber"}>
                  {user.verifiedSeller ? "Verified seller" : `Verification ${user.verification.status}`}
                </Badge>
                <Badge tone="slate">{SELLER_KIND_LABEL[user.sellerKind]}</Badge>
              </p>
              <p className="text-[11px] text-ink-500">
                {user.city} {user.pincode} · wallet {inr(user.walletBalance)} ·{" "}
                {user.verification.gstin ? `GSTIN ${user.verification.gstin}` : user.verification.registrationId ?? "Individual seller"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-ink-500">
            <span className="inline-flex items-center gap-1 font-bold text-amber-600">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {user.rating.toFixed(1)} rating
            </span>
            <Link href="/account#seller-upgrade" className="font-bold text-brand-700 underline">
              Upgrade / add documents
            </Link>
          </div>
        </div>
        {pending ? (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-amber-50 p-2.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            <AlertTriangle className="h-4 w-4" /> {pending} rental return{pending > 1 ? "s" : ""} awaiting inspection —
            release the deposit to close them out.
          </p>
        ) : null}
      </Card>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Live listings" value={available} hint={`${listings.length} total`} icon={<BookMarked className="h-4 w-4" />} />
        <Stat
          label="Active rentals"
          value={activeRentals.length}
          hint={`${escrow ? inr(escrow) : "₹0"} deposit in escrow`}
          tone="brand"
          icon={<Repeat className="h-4 w-4" />}
        />
        <Stat
          label="Sales (gross)"
          value={inr(grossSales)}
          hint={`− ${inr(commission)} commission`}
          tone="cash"
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <Stat
          label="Rental income"
          value={inr(rentalIncome)}
          hint="Fees + penalties settled"
          tone="emerald"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      <div className="space-y-4">
        <ListingsTable listings={listings} />
        <RentalLedger rentals={rentals} />
        <SalesPanel sales={sales} />
      </div>

      <Card className="mt-5 p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
          <LayoutDashboard className="h-3.5 w-3.5" /> Growth levers
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="font-bold text-ink-900">Enable renting on slow movers</p>
            <p className="mt-0.5 text-ink-500">
              Rentable listings get 3.4× the views. A 90-day semester tier at ~6% of value per month keeps the copy
              earning while it's away.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="font-bold text-ink-900">Complete your stock sheet</p>
            <p className="mt-0.5 text-ink-500">
              Registered bookstores and libraries can list in bulk with a CSV of ISBNs; Bookart auto-fills title, author
              and MRP.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="font-bold text-ink-900">Keep condition photos fresh</p>
            <p className="mt-0.5 text-ink-500">
              Listings with a sample-page photo convert 41% better and see far fewer deposit disputes.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
