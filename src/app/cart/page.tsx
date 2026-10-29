import { SectionHeader } from "@/components/ui";
import { CartPageClient } from "@/components/cart/cart-page-client";

export const metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-5">
      <SectionHeader
        title="Your cart"
        description="Buy outright or rent with a refundable security deposit — mix both in one order."
      />
      <CartPageClient />
    </div>
  );
}
