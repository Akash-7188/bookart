"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_PLACE, findPlaceByPincode, nearestPlace } from "@/lib/geo";

export interface LocationState {
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  label: string;
  source: "gps" | "manual" | "default";
  radiusKm: number;
  /** Browser geolocation lifecycle for the "Use current location" button. */
  status: "idle" | "locating" | "denied" | "ready";
  error?: string;
  setManual: (pincodeOrCity: string) => boolean;
  setCoords: (coords: { latitude: number; longitude: number }, source?: "gps" | "manual") => void;
  useCurrentLocation: () => void;
  setRadius: (km: number) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      city: DEFAULT_PLACE.city,
      pincode: DEFAULT_PLACE.pincode,
      latitude: DEFAULT_PLACE.latitude,
      longitude: DEFAULT_PLACE.longitude,
      label: DEFAULT_PLACE.label,
      source: "default",
      radiusKm: 25,
      status: "idle",

      setManual: (input) => {
        const place = findPlaceByPincode(input);
        if (!place) return false;
        set({
          city: place.city,
          pincode: place.pincode,
          latitude: place.latitude,
          longitude: place.longitude,
          label: place.label,
          source: "manual",
          status: "ready",
          error: undefined,
        });
        void syncLocationCookie(get());
        return true;
      },

      setCoords: (coords, source = "gps") => {
        const place = nearestPlace(coords);
        set({
          city: place.city,
          pincode: place.pincode,
          latitude: coords.latitude,
          longitude: coords.longitude,
          label: `${place.city} (${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)})`,
          source,
          status: "ready",
          error: undefined,
        });
        void syncLocationCookie(get());
      },

      useCurrentLocation: () => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          set({ status: "denied", error: "Geolocation is not available in this browser." });
          return;
        }
        set({ status: "locating", error: undefined });
        navigator.geolocation.getCurrentPosition(
          (position) => {
            get().setCoords(
              { latitude: Number(position.coords.latitude.toFixed(5)), longitude: Number(position.coords.longitude.toFixed(5)) },
              "gps",
            );
          },
          (error) => {
            set({
              status: "denied",
              // GPS is blocked in sandboxed previews — fall back to the IP-located default city.
              error:
                error.code === error.PERMISSION_DENIED
                  ? "Location permission denied — using your saved city."
                  : "Couldn't fetch GPS — using your saved city.",
            });
            setTimeout(() => set({ status: "idle" }), 2600);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 300_000 },
        );
      },

      setRadius: (radiusKm) => {
        set({ radiusKm });
        void syncLocationCookie(get());
      },
    }),
    { name: "bookart:location" },
  ),
);

/** Mirrors the client location into a cookie so server components filter server-side too. */
async function syncLocationCookie(state: LocationState) {
  try {
    const payload = {
      city: state.city,
      pincode: state.pincode,
      latitude: state.latitude,
      longitude: state.longitude,
      label: state.label,
      source: state.source,
    };
    await fetch("/api/location", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, radiusKm: state.radiusKm }),
      cache: "no-store",
    });
  } catch {
    /* offline / preview — client store still drives the UI */
  }
}
