"use client";

import * as React from "react";
import { Check, Crosshair, LocateFixed, MapPin, Navigation, Search } from "lucide-react";
import { Badge, Button, Input, Sheet } from "@/components/ui";
import { useLocationStore } from "@/store/location-store";
import { PINCODE_INDEX, RADIUS_OPTIONS } from "@/lib/geo";
import { cn } from "@/lib/utils";

export function LocationPicker() {
  const {
    label,
    city,
    pincode,
    radiusKm,
    status,
    error,
    useCurrentLocation,
    setManual,
    setRadius,
    source,
  } = useLocationStore();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [notFound, setNotFound] = React.useState(false);

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PINCODE_INDEX.slice(0, 8);
    return PINCODE_INDEX.filter(
      (p) => p.pincode.includes(q) || p.city.toLowerCase().includes(q) || p.state.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-brand-50"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700">
          {source === "gps" ? <Crosshair className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-500">Deliver to</span>
          <span className="flex items-center gap-1.5">
            <span className="truncate text-xs font-bold text-ink-900">{city}</span>
            <span className="text-xs text-ink-500">{pincode}</span>
            <span className="text-brand-600 group-hover:underline">▾</span>
          </span>
        </span>
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        side="bottom"
        title="Choose delivery location"
        description="Radius filtering works off this point — GPS, saved address or pincode."
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-500">
              Searching within <strong className="text-ink-900">{RADIUS_OPTIONS.find((r) => r.value === radiusKm)?.short ?? "Anywhere"}</strong>
            </p>
            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Button variant="primary" full loading={status === "locating"} onClick={useCurrentLocation}>
            <LocateFixed className="h-4 w-4" /> Use current location (GPS)
          </Button>

          {status === "denied" && error ? (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">{error}</p>
          ) : null}

          {source === "gps" ? (
            <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 ring-1 ring-emerald-200">
              <Navigation className="mr-1 inline h-3.5 w-3.5" />
              Using your live GPS fix: {label}
            </p>
          ) : null}

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-ink-700" htmlFor="pincode-search">
              Enter pincode or city
            </label>
            <div className="flex gap-2">
              <Input
                id="pincode-search"
                inputMode="numeric"
                placeholder="e.g. 452010 or Indore"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setNotFound(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const ok = setManual(query);
                    setNotFound(!ok);
                    if (ok) setOpen(false);
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  const ok = setManual(query);
                  setNotFound(!ok);
                  if (ok) setOpen(false);
                }}
              >
                <Search className="h-4 w-4" /> Set
              </Button>
            </div>
            {notFound ? (
              <p className="mt-1.5 text-xs text-rose-600">
                We don't have that pincode indexed in the demo — try 454775, 453441, 452001, 462001, 110006, 411001.
              </p>
            ) : null}
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink-700">Saved & popular locations</p>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {matches.map((place) => {
                const active = place.pincode === pincode;
                return (
                  <li key={`${place.pincode}-${place.city}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setManual(place.pincode);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-brand-50/60",
                        active && "bg-brand-50",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink-900">{place.city}</span>
                        <span className="block text-xs text-ink-500">
                          {place.pincode} · {place.state}
                        </span>
                      </span>
                      {active ? <Check className="h-4 w-4 text-brand-600" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink-700">From your address book</p>
            <div className="flex gap-2 text-xs">
              <Badge tone="slate">Home · {pincode}</Badge>
              <Badge tone="slate">Work · 452010</Badge>
            </div>
          </div>
        </div>
      </Sheet>
    </>
  );
}

export function RadiusSelector({ compact = false }: { compact?: boolean }) {
  const { radiusKm, setRadius, city } = useLocationStore();
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", compact && "gap-1")}>
      {RADIUS_OPTIONS.map((option) => {
        const active = option.value === radiusKm;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setRadius(option.value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
              active
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-200 bg-white text-ink-600 hover:border-brand-300",
            )}
            title={`Search listings around ${city}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
