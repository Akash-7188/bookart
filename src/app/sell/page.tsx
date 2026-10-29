import Link from "next/link";
import { BadgeIndianRupee, PackageCheck, Store, Timer } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { ListingWizard } from "@/components/seller/listing-wizard";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sell or list an item" };

export default async function SellPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6">
      <div className="mb-4 rounded-3xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-amber-50 p-5 sm:p-6">
        <Badge tone="cash" icon={<Store className="h-3 w-3" />}>
          Seller listing portal
        </Badge>
        <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          List a book, notes bundle or study pack
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-600">
          Five short steps: category → details → condition → price & rental → pickup point. Your listing instantly joins
          the radius search, so buyers within their chosen distance see it first.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: <BadgeIndianRupee className="h-4 w-4" />, t: "Free for individuals", d: "5% commission on a sale, 12% on rental fees. No listing charge." },
            { icon: <Timer className="h-4 w-4" />, t: "Rent or sell", d: "Toggle renting on and set ₹/day — Bookart generates 7/15/30/90-day tiers." },
            { icon: <PackageCheck className="h-4 w-4" />, t: "Local first", d: "Buyers pick up within 10 km or choose ₹49 courier beyond." },
          ].map((item) => (
            <Card key={item.t} className="p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-ink-900">
                <span className="text-brand-600">{item.icon}</span>
                {item.t}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-500">{item.d}</p>
            </Card>
          ))}
        </div>
      </div>

      <ListingWizard user={user} />

      <p className="mt-6 text-center text-xs text-ink-500">
        Selling as a shop or library?{" "}
        <Link href="/account#seller-upgrade" className="font-bold text-brand-700 underline">
          Submit GSTIN / registration ID
        </Link>{" "}
        for the verified badge and bulk listing tools.
      </p>
    </div>
  );
}
