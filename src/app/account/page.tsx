import Link from "next/link";
import { UserRound } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { AccountClient } from "@/components/account/account-client";
import { getCart, purchasesForBuyer, rentalsForBuyer } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  hostedGetCart,
  hostedPurchasesForBuyer,
  hostedRentalsForBuyer,
  isSupabaseConfigured,
} from "@/lib/hosted-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<UserRound className="h-6 w-6" />}
          title="Sign in to view your account"
          description="Wallet balance, refund ledger, seller verification and saved addresses live here."
          action={
            <Link href="/login?next=/account">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const [rentals, purchases, cart] = isSupabaseConfigured()
    ? await Promise.all([
        hostedRentalsForBuyer(user.id),
        hostedPurchasesForBuyer(user.id),
        hostedGetCart(user.id),
      ])
    : [rentalsForBuyer(user.id), purchasesForBuyer(user.id), getCart(user.id)];

  const refunds = rentals
    .filter((r) => r.status === "refunded")
    .map((r) => ({
      id: r.id,
      amount: r.refundAmount,
      at: r.refundedAt,
      note: `${r.product?.title ?? "Listing"} — deposit refund after inspection`,
    }));

  return (
    <AccountClient
      user={user}
      stats={{
        orders: purchases.length,
        rentals: rentals.length,
        activeRentals: rentals.filter((r) => ["active", "overdue", "return_requested"].includes(r.status)).length,
        escrow: rentals
          .filter((r) => ["active", "overdue", "return_requested"].includes(r.status))
          .reduce((sum, r) => sum + r.depositPaid, 0),
        saved: cart.lines.length,
      }}
      refunds={refunds}
    />
  );
}
