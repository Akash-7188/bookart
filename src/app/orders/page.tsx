import Link from "next/link";
import Image from "next/image";
import { CalendarClock, CheckCircle2, MapPin, Package, PackageCheck, Truck, Wallet } from "lucide-react";
import { Badge, Button, Card, EmptyState, SectionHeader, Stat } from "@/components/ui";
import { purchasesForBuyer } from "@/lib/db";
import { hostedPurchasesForBuyer, isSupabaseConfigured } from "@/lib/hosted-data";
import { getCurrentUser } from "@/lib/session";
import { coverDataUri } from "@/lib/covers";
import { inr } from "@/lib/rental";
import type { PurchaseStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "My orders" };

const STAGES: { key: PurchaseStatus; label: string }[] = [
  { key: "placed", label: "Placed" },
  { key: "packed", label: "Packed" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

export default async function OrdersPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title="Sign in to track your orders"
          description="Your purchases, courier status and pickup OTPs live here."
          action={
            <Link href="/login?next=/orders">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const orders = isSupabaseConfigured()
    ? await hostedPurchasesForBuyer(user.id)
    : purchasesForBuyer(user.id);
  const spend = orders.reduce((sum, o) => sum + o.amount + o.courierFee, 0);
  const delivered = orders.filter((o) => o.status === "delivered").length;

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-5">
      <SectionHeader
        title="My orders"
        description="Books you've bought — local pickup or courier to your address."
        action={
          <Link href="/marketplace">
            <Button variant="outline" size="sm">
              Continue shopping
            </Button>
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Orders" value={orders.length} icon={<Package className="h-4 w-4" />} />
        <Stat label="Delivered" value={delivered} tone="emerald" icon={<CheckCircle2 className="h-4 w-4" />} />
        <Stat label="Total spend" value={inr(spend)} tone="cash" icon={<Wallet className="h-4 w-4" />} />
      </div>

      {orders.length ? (
        <div className="space-y-3">
          {orders.map((order) => {
            const stageIndex = Math.max(0, STAGES.findIndex((s) => s.key === order.status));
            return (
              <Card key={order.id} className="p-4">
                <div className="flex flex-wrap items-start gap-4">
                  {order.product ? (
                    <Image
                      src={coverDataUri(order.product, "front")}
                      alt=""
                      width={120}
                      height={160}
                      unoptimized
                      className="h-24 w-18 rounded-lg object-cover ring-1 ring-slate-200"
                    />
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={order.status === "delivered" ? "emerald" : "brand"}>
                        {STAGES.find((s) => s.key === order.status)?.label ?? order.status}
                      </Badge>
                      <span className="text-[11px] text-ink-500">#{order.id}</span>
                      <span className="text-[11px] text-ink-500">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    <Link href={`/product/${order.productId}`} className="mt-1 block">
                      <p className="text-sm font-bold text-ink-900 hover:text-brand-700">
                        {order.product?.title ?? "Listing removed"}
                      </p>
                    </Link>
                    <p className="text-xs text-ink-500">
                      {order.product?.author} · sold by {order.seller?.name}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-ink-600">
                      <span className="inline-flex items-center gap-1">
                        {order.deliveryMode === "courier" ? <Truck className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                        {order.deliveryMode === "courier" ? `Courier · ${inr(order.courierFee)}` : "Local pickup"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Wallet className="h-3.5 w-3.5" /> Paid via {order.paymentMethod.toUpperCase()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" /> Address: {order.address}
                      </span>
                    </div>

                    <ol className="mt-3 flex items-center gap-1.5">
                      {STAGES.map((stage, i) => (
                        <li key={stage.key} className="flex flex-1 items-center gap-1.5">
                          <span
                            className={cn(
                              "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold",
                              i <= stageIndex ? "bg-emerald-500 text-white" : "bg-slate-200 text-ink-500",
                            )}
                          >
                            {i <= stageIndex ? "✓" : i + 1}
                          </span>
                          <span className={cn("hidden text-[10px] font-semibold sm:block", i <= stageIndex ? "text-ink-900" : "text-ink-500")}>
                            {stage.label}
                          </span>
                          {i < STAGES.length - 1 ? <span className="h-0.5 flex-1 rounded bg-slate-200" /> : null}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-extrabold text-ink-900">{inr(order.amount + order.courierFee)}</p>
                    <p className="text-[11px] text-ink-500">{order.deliveryMode === "courier" ? "incl. courier" : "no delivery fee"}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<PackageCheck className="h-6 w-6" />}
          title="No orders yet"
          description="Find a textbook from a seller near you, or rent one for the semester."
          action={
            <Link href="/marketplace">
              <Button>Explore listings</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
