"use client";

import * as React from "react";
import Image from "next/image";
import { ImageOff, ZoomIn } from "lucide-react";
import { Sheet } from "@/components/ui";
import { GALLERY_VIEWS, VIEW_LABELS, coverDataUri, type CoverView } from "@/lib/covers";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Multi-image gallery: front cover, back cover, spine and a sample inner page
 * (the four shots Bookart asks every seller to upload).
 */
export function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = React.useState<CoverView>("front");
  const [zoom, setZoom] = React.useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <Image
          src={coverDataUri(product, active)}
          alt={`${product.title} — ${VIEW_LABELS[active]}`}
          width={600}
          height={800}
          unoptimized
          priority
          className="mx-auto h-[320px] w-auto object-contain sm:h-[420px]"
        />
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-ink-900/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-ink-900"
        >
          <ZoomIn className="h-3.5 w-3.5" /> Zoom
        </button>
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink-700 ring-1 ring-slate-200">
          {VIEW_LABELS[active]}
        </span>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {GALLERY_VIEWS.map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setActive(view)}
            className={cn(
              "shrink-0 overflow-hidden rounded-xl border-2 bg-white p-0.5 transition",
              active === view ? "border-brand-600 ring-2 ring-brand-500/20" : "border-slate-200 hover:border-brand-300",
            )}
            aria-label={VIEW_LABELS[view]}
          >
            <Image
              src={coverDataUri(product, view)}
              alt={VIEW_LABELS[view]}
              width={120}
              height={160}
              unoptimized
              className="h-16 w-12 object-cover sm:h-20 sm:w-15"
            />
          </button>
        ))}
      </div>

      {product.conditionNotes.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-800">
            <ImageOff className="h-3.5 w-3.5" /> Seller-disclosed defects
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-amber-900">
            {product.conditionNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Sheet open={zoom} onClose={() => setZoom(false)} side="center" title={`${product.title} — ${VIEW_LABELS[active]}`}>
        <Image
          src={coverDataUri(product, active)}
          alt={VIEW_LABELS[active]}
          width={600}
          height={800}
          unoptimized
          className="mx-auto h-auto w-full max-w-sm rounded-xl"
        />
        <p className="mt-3 text-center text-xs text-ink-500">
          Photographed by the seller · Bookart condition standard 2.1
        </p>
      </Sheet>
    </div>
  );
}
