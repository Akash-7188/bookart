import Link from "next/link";
import { BookOpenCheck, HandCoins, Repeat, ShieldCheck, Wallet } from "lucide-react";
import { Badge, Button, Card, EmptyState, SectionHeader, Stat } from "@/components/ui";
import { RentalList } from "@/components/rental/rental-list";
import { rentalsForBuyer } from "@/lib/db";
import { hostedRentalsForBuyer, isSupabaseConfigured } from "@/lib/hosted-data";
import { getCurrentUser } from "@/lib/session";
import { inr } from "@/lib/rental";

export const dynamic = "force-dynamic";
export const metadata = { title: "My rentals & deposits" };

export default async function RentalsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<Repeat className="h-6 w-6" />}
          title="Sign in to see your rentals"
          description="Track due dates, request returns and watch your deposit move from escrow back to your wallet."
          action={
            <Link href="/login?next=/rentals">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const rentals = isSupabaseConfigured()
    ? await hostedRentalsForBuyer(user.id)
    : rentalsForBuyer(user.id);
  const active = rentals.filter((r) => r.status === "active" || r.status === "overdue" || r.status === "return_requested");
  const escrow = active.reduce((sum, r) => sum + r.depositPaid, 0);
  const refunded = rentals.filter((r) => r.status === "refunded").reduce((sum, r) => sum + r.refundAmount, 0);
  const fees = rentals.reduce((sum, r) => sum + r.rentalFee, 0);

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-5">
      <SectionHeader
        title="My rentals & security deposits"
        description="Every rental holds the item value as a deposit in Bookart escrow. Return it, the seller inspects, you get the money back."
        action={
          <Link href="/marketplace?mode=rent">
            <Button variant="outline" size="sm">
              Rent something else
            </Button>
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active rentals" value={active.length} icon={<Repeat className="h-4 w-4" />} />
        <Stat label="Deposit in escrow" value={inr(escrow)} tone="brand" icon={<ShieldCheck className="h-4 w-4" />} />
        <Stat label="Refunded so far" value={inr(refunded)} tone="emerald" icon={<HandCoins className="h-4 w-4" />} />
        <Stat label="Rental fees paid" value={inr(fees)} tone="cash" icon={<Wallet className="h-4 w-4" />} hint="Kept by sellers" />
      </div>

      {active.length ? (
        <Card className="mb-5 border-brand-200 bg-brand-50/60 p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-brand-900">
            <BookOpenCheck className="h-4 w-4" /> Return checklist
          </p>
          <ul className="mt-2 grid gap-1.5 text-xs text-brand-900 sm:grid-cols-3">
            <li>• Hand over the copy in the condition you received it (photos are attached to the listing).</li>
            <li>• Request the return here at least 2 days before the due date to avoid late fees.</li>
            <li>• The seller inspects within 48 h — refund lands in your wallet the moment they confirm.</li>
          </ul>
        </Card>
      ) : null}

      {rentals.length ? (
        <RentalList rentals={rentals} />
      ) : (
        <EmptyState
          icon={<Repeat className="h-6 w-6" />}
          title="No rentals yet"
          description="Rentals cost a fraction of the cover price and the deposit comes back after inspection. Perfect for one-semester reads."
          action={
            <Link href="/marketplace?mode=rent">
              <Button>See rentable listings</Button>
            </Link>
          }
        />
      )}

      <Card className="mt-6 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">How the refund is calculated</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-xs">
            <thead>
              <tr className="text-left text-ink-500">
                <th className="py-1.5">Component</th>
                <th className="py-1.5">When</th>
                <th className="py-1.5 text-right">Who gets it</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-ink-700">
              <tr>
                <td className="py-2 font-semibold">Deposit (full item value)</td>
                <td className="py-2">At checkout</td>
                <td className="py-2 text-right">Held in escrow</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">Rental fee (per duration tier)</td>
                <td className="py-2">At checkout</td>
                <td className="py-2 text-right">Seller</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">Refund = deposit − fee − damage − late</td>
                <td className="py-2">After inspection</td>
                <td className="py-2 text-right">Renter (wallet / original method)</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">Damage penalty (0/10/35/100%)</td>
                <td className="py-2">On inspection</td>
                <td className="py-2 text-right">Seller compensation</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">Late fee (10% of daily rate per day)</td>
                <td className="py-2">Past due date</td>
                <td className="py-2 text-right">Seller compensation</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="brand">Escrow protected</Badge>
          <Badge tone="emerald">Wallet refunds instant</Badge>
          <Badge tone="amber">Damage grading scale published</Badge>
        </div>
      </Card>
    </div>
  );
}
