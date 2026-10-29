import Link from "next/link";
import { AlertOctagon, IndianRupee, Search, ShieldCheck, Users } from "lucide-react";
import { Badge, Button, Card, EmptyState, SectionHeader, Stat } from "@/components/ui";
import { VerificationQueue } from "@/components/admin/admin-console";
import { getDb, platformStats, platformStatsFor } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { inr } from "@/lib/rental";
import { hostedAdminSnapshot, isSupabaseConfigured } from "@/lib/hosted-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin console" };

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title="Admin access required"
          description="Trust & Safety console: seller verification, escrow exposure, prohibited listings and dispute handling. Sign in with the admin demo account to explore."
          action={
            <Link href="/login?next=/admin">
              <Button>Sign in as admin</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const db = isSupabaseConfigured() ? await hostedAdminSnapshot() : getDb();
  const stats = isSupabaseConfigured() ? platformStatsFor(db) : platformStats();
  const pending = db.users.filter((u) => u.verification.status === "pending");
  const trending = db.meta.searchLog.slice(-8).reverse();
  const disputes = db.rentals.filter((r) => r.status === "overdue" || r.penaltyAmount > 0);

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-5">
      <SectionHeader
        title="Admin console"
        description="Marketplace health, seller verification and escrow exposure."
        action={<Badge tone="dark">Trust & Safety</Badge>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Escrow liability" value={inr(stats.escrowHeld)} tone="brand" icon={<ShieldCheck className="h-4 w-4" />} hint={`${stats.activeRentals} active rentals`} />
        <Stat label="GMV (sales)" value={inr(stats.salesRevenue)} tone="cash" icon={<IndianRupee className="h-4 w-4" />} hint={`+ ${inr(stats.rentalRevenue)} rental fees`} />
        <Stat label="Users" value={stats.users} icon={<Users className="h-4 w-4" />} hint={`${stats.sellers} sellers · ${stats.stores} stores · ${stats.libraries} libraries`} />
        <Stat label="Pending verifications" value={stats.pendingVerifications} tone={stats.pendingVerifications ? "rose" : "emerald"} icon={<AlertOctagon className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <VerificationQueue users={pending} />

          <Card className="p-4">
            <p className="text-sm font-extrabold text-ink-900">Deposit disputes & overdue rentals ({disputes.length})</p>
            <p className="text-[11px] text-ink-500">
              Damaged or late returns where a penalty was applied or is accruing.
            </p>
            <ul className="mt-3 divide-y divide-slate-100">
              {disputes.map((rental) => {
                const product = db.products.find((p) => p.id === rental.productId);
                const buyer = db.users.find((u) => u.id === rental.buyerId);
                const seller = db.users.find((u) => u.id === rental.sellerId);
                return (
                  <li key={rental.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">{product?.title ?? "Removed listing"}</p>
                      <p className="text-[11px] text-ink-500">
                        {buyer?.name} ← {seller?.name} · {rental.status} · deposit {inr(rental.depositPaid)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {rental.penaltyAmount > 0 ? <Badge tone="rose">penalty {inr(rental.penaltyAmount)}</Badge> : null}
                      {rental.lateFee > 0 ? <Badge tone="amber">late {inr(rental.lateFee)}</Badge> : null}
                      <Link href={`/product/${rental.productId}`} className="text-[11px] font-bold text-brand-700 hover:underline">
                        Inspect →
                      </Link>
                    </div>
                  </li>
                );
              })}
              {!disputes.length ? (
                <li className="py-3 text-sm text-ink-500">No disputes. Every rental is on schedule.</li>
              ) : null}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Catalogue health</p>
            <ul className="mt-2 space-y-1.5 text-xs text-ink-600">
              <li className="flex justify-between">
                <span>Listings</span>
                <strong className="text-ink-900">{stats.listings}</strong>
              </li>
              <li className="flex justify-between">
                <span>Available</span>
                <strong className="text-emerald-700">{stats.available}</strong>
              </li>
              <li className="flex justify-between">
                <span>On rent</span>
                <strong className="text-amber-700">{stats.rented}</strong>
              </li>
              <li className="flex justify-between">
                <span>Sold</span>
                <strong className="text-rose-700">{stats.sold}</strong>
              </li>
              <li className="flex justify-between">
                <span>Reviews</span>
                <strong className="text-ink-900">{stats.reviews}</strong>
              </li>
            </ul>
          </Card>

          <Card className="p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
              <Search className="h-3.5 w-3.5" /> Live search log
            </p>
            <ul className="mt-2 space-y-1 text-xs text-ink-600">
              {trending.length ? (
                trending.map((entry, i) => (
                  <li key={`${entry.at}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{entry.q}</span>
                    <span className="shrink-0 text-[10px] text-ink-500">
                      {new Date(entry.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-ink-500">No searches recorded in this session yet.</li>
              )}
            </ul>
          </Card>

          <Card className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Policy guardrails</p>
            <ul className="mt-2 space-y-1.5 text-[11px] text-ink-600">
              <li>• Deposits are held by Bookart, never by sellers — refunds execute from our ledger.</li>
              <li>• Penalties above 35% require photo evidence from the inspection.</li>
              <li>• Digital/copyrighted study packs are reviewed manually before going live.</li>
              <li>• Sellers with 3 unresolved disputes drop below the verified tier.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
