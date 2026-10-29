import { MapPin, Navigation } from "lucide-react";
import { formatDistance } from "@/lib/geo";

/**
 * Lightweight schematic "map" for the PDP: buyer pin, seller pin, distance
 * measured by the Haversine engine. Production swaps this for the Mapbox/
 * Google tile layer with an ST_DWithin overlay.
 */
export function DistanceMap({
  buyerLabel,
  sellerLabel,
  distanceKm,
  sellerArea,
}: {
  buyerLabel: string;
  sellerLabel: string;
  distanceKm: number | null;
  sellerArea: string;
}) {
  const km = distanceKm ?? 0;
  const clamped = Math.min(1, Math.max(0.12, km / 30));
  const x2 = 60 + clamped * 300;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-sky-50 to-white">
      <svg viewBox="0 0 400 170" className="h-32 w-full sm:h-36" role="img" aria-label="Distance between you and the seller">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0v40" fill="none" stroke="#cbd5e1" strokeWidth="1" opacity="0.6" />
          </pattern>
        </defs>
        <rect width="400" height="170" fill="url(#grid)" />
        <path d="M0 120 Q110 96 200 116 T400 108" fill="none" stroke="#94a3b8" strokeWidth="3" opacity="0.5" />
        <path d="M40 0 Q120 70 90 170" fill="none" stroke="#94a3b8" strokeWidth="3" opacity="0.4" />
        <line x1="60" y1="86" x2={x2} y2="86" stroke="#4f46e5" strokeWidth="2.5" strokeDasharray="7 6" />
        <circle cx={x2} cy="86" r="16" fill="#f59e0b" opacity="0.18" />
        <circle cx="60" cy="86" r="8" fill="#4f46e5" />
        <circle cx="60" cy="86" r="14" fill="#4f46e5" opacity="0.18" />
        <circle cx={x2} cy="86" r="8" fill="#f59e0b" />
        <text x="60" y="118" textAnchor="middle" fontSize="11" fontWeight="700" fill="#312e81">
          You
        </text>
        <text x={Math.min(340, x2)} y="118" textAnchor="middle" fontSize="11" fontWeight="700" fill="#92400e">
          Seller
        </text>
        <text x="200" y="72" textAnchor="middle" fontSize="12" fontWeight="800" fill="#4f46e5">
          {formatDistance(distanceKm)}
        </text>
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white/70 px-3 py-2 text-[11px]">
        <span className="inline-flex items-center gap-1 font-semibold text-ink-700">
          <MapPin className="h-3 w-3 text-brand-600" /> {buyerLabel}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-ink-700">
          <Navigation className="h-3 w-3 text-amber-600" /> {sellerLabel} · {sellerArea}
        </span>
      </div>
    </div>
  );
}
