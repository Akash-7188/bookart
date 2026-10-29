import { BookMarked, Building2, GraduationCap, Home, Landmark, ShieldCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui";
import { CONDITION_MAP, MODE_LABEL, SELLER_KIND_LABEL, listingModeOf } from "@/lib/constants";
import { formatDistance } from "@/lib/geo";
import type { Condition, Product, SellerKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ConditionBadge({ condition, className }: { condition: Condition; className?: string }) {
  const meta = CONDITION_MAP[condition];
  const tone = (["emerald", "sky", "amber", "rose"] as const).includes(meta.tone as never)
    ? (meta.tone as "emerald" | "sky" | "amber" | "rose")
    : "slate";
  return (
    <Badge tone={tone} className={cn("ring-1", className)}>
      {meta.label}
    </Badge>
  );
}

export function ModeBadge({
  product,
  className,
}: {
  product: Pick<Product, "buyPrice" | "isRentable">;
  className?: string;
}) {
  const mode = listingModeOf(product);
  const tone = mode === "both" ? "brand" : mode === "rent" ? "cash" : "dark";
  return (
    <Badge tone={tone} className={className}>
      {mode === "both" ? "Buy & Rent" : MODE_LABEL[mode]}
    </Badge>
  );
}

export function SellerKindBadge({ kind, className }: { kind: SellerKind; className?: string }) {
  const icon =
    kind === "bookstore" ? <Building2 className="h-3 w-3" /> : kind === "library" ? <Landmark className="h-3 w-3" /> : <Home className="h-3 w-3" />;
  const tone = kind === "bookstore" ? "sky" : kind === "library" ? "emerald" : "slate";
  return (
    <Badge tone={tone} icon={icon} className={className}>
      {SELLER_KIND_LABEL[kind]}
    </Badge>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <Badge tone="brand" icon={<ShieldCheck className="h-3 w-3" />} className={className}>
      Verified
    </Badge>
  );
}

export function DistancePill({
  km,
  className,
  courier = false,
}: {
  km: number | null | undefined;
  className?: string;
  courier?: boolean;
}) {
  const text = formatDistance(km);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-ink-700 ring-1 ring-slate-200 backdrop-blur",
        className,
      )}
    >
      {km !== null && km !== undefined && km <= 400 ? (
        <Home className="h-3 w-3 text-brand-600" />
      ) : (
        <Truck className="h-3 w-3 text-amber-600" />
      )}
      {text}
      {courier ? "" : ""}
    </span>
  );
}

export function KindBadge({ kind }: { kind: Product["kind"] }) {
  if (kind === "book") return <Badge tone="slate" icon={<BookMarked className="h-3 w-3" />}>Book</Badge>;
  if (kind === "notes") return <Badge tone="amber" icon={<GraduationCap className="h-3 w-3" />}>Notes</Badge>;
  return <Badge tone="amber" icon={<GraduationCap className="h-3 w-3" />}>Study Bundle</Badge>;
}

export function StatusBadge({ status }: { status: Product["status"] }) {
  const map = {
    available: { tone: "emerald" as const, label: "Available" },
    rented: { tone: "amber" as const, label: "Currently on rent" },
    sold: { tone: "rose" as const, label: "Sold" },
    draft: { tone: "slate" as const, label: "Draft" },
  };
  const meta = map[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
