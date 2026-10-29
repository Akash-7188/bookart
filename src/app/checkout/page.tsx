import { SectionHeader } from "@/components/ui";
import { CheckoutClient } from "@/components/checkout/checkout-client";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-5">
      <SectionHeader
        title="Checkout"
        description="Local pickup or courier, prepaid deposits, escrow-protected refunds."
      />
      <CheckoutClient user={user} />
    </div>
  );
}
