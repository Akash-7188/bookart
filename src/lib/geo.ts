/**
 * Geo engine — Haversine distance + location resolution.
 *
 * In production this query runs inside Postgres with PostGIS
 * (`ST_DWithin` on a `geography(Point)` column, see /supabase/schema.sql).
 * For the zero-config demo build we compute the exact same great-circle
 * distance in TypeScript so radius filtering behaves identically.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Place extends Coordinates {
  city: string;
  state: string;
  pincode: string;
  label: string;
}

const EARTH_RADIUS_KM = 6371;

export function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two points in kilometres. */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function roundKm(km: number, precision = 1) {
  const factor = 10 ** precision;
  return Math.round(km * factor) / factor;
}

/** "2.4 km away" / "850 m away" / "Anywhere (courier)" */
export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || Number.isNaN(km)) return "Distance unknown";
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m away`;
  if (km > 400) return "Courier delivery";
  return `${roundKm(km)} km away`;
}

/** Radius options surfaced in the filter rail. */
export const RADIUS_OPTIONS = [
  { value: 5, label: "Within 5 km", short: "5 km" },
  { value: 10, label: "Within 10 km", short: "10 km" },
  { value: 25, label: "Within 25 km", short: "25 km" },
  { value: 100, label: "Within 100 km", short: "100 km" },
  { value: 0, label: "Anywhere (courier delivery)", short: "Anywhere" },
] as const;

/**
 * Pincode → coordinates lookup used by the "Deliver to" widget.
 * Production replaces this with a postal-code geocoder (Google Places /
 * MapmyIndia) plus PostGIS reverse geocoding.
 */
export const PINCODE_INDEX: Place[] = [
  { pincode: "454775", city: "Pithampur", state: "Madhya Pradesh", latitude: 22.6197, longitude: 75.6926, label: "Pithampur, MP" },
  { pincode: "454001", city: "Dhar", state: "Madhya Pradesh", latitude: 22.6013, longitude: 75.3021, label: "Dhar, MP" },
  { pincode: "453441", city: "Mhow", state: "Madhya Pradesh", latitude: 22.553, longitude: 75.756, label: "Mhow (Dr. Ambedkar Nagar), MP" },
  { pincode: "452001", city: "Indore", state: "Madhya Pradesh", latitude: 22.7196, longitude: 75.8577, label: "Indore, MP" },
  { pincode: "452010", city: "Indore", state: "Madhya Pradesh", latitude: 22.756, longitude: 75.893, label: "Vijay Nagar, Indore" },
  { pincode: "456001", city: "Ujjain", state: "Madhya Pradesh", latitude: 23.1793, longitude: 75.7849, label: "Ujjain, MP" },
  { pincode: "462001", city: "Bhopal", state: "Madhya Pradesh", latitude: 23.2599, longitude: 77.4126, label: "Bhopal, MP" },
  { pincode: "110006", city: "Delhi", state: "Delhi", latitude: 28.6139, longitude: 77.209, label: "New Delhi" },
  { pincode: "400001", city: "Mumbai", state: "Maharashtra", latitude: 19.076, longitude: 72.8777, label: "Mumbai, MH" },
  { pincode: "411001", city: "Pune", state: "Maharashtra", latitude: 18.5204, longitude: 73.8567, label: "Pune, MH" },
  { pincode: "600001", city: "Chennai", state: "Tamil Nadu", latitude: 13.0827, longitude: 80.2707, label: "Chennai, TN" },
  { pincode: "700001", city: "Kolkata", state: "West Bengal", latitude: 22.5726, longitude: 88.3639, label: "Kolkata, WB" },
];

export const DEFAULT_PLACE: Place = PINCODE_INDEX[0]; // Pithampur, MP

export function findPlaceByPincode(input: string): Place | null {
  const digits = input.replace(/\D/g, "").slice(0, 6);
  if (digits.length < 3) return null;
  return (
    PINCODE_INDEX.find((p) => p.pincode === digits) ??
    PINCODE_INDEX.find((p) => p.city.toLowerCase().startsWith(input.trim().toLowerCase())) ??
    null
  );
}

export function parseLatLng(input: string | undefined | null): Coordinates | null {
  if (!input) return null;
  const [lat, lng] = input.split(",").map((n) => Number(n));
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { latitude: lat, longitude: lng };
  return null;
}

/** Bounding box pre-filter — the SQL index-friendly half of a radius query. */
export function boundingBox(center: Coordinates, radiusKm: number) {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos(toRad(center.latitude)) || 1);
  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLng: center.longitude - lngDelta,
    maxLng: center.longitude + lngDelta,
  };
}

/** Rough "nearest city" reverse geocode used when the browser GPS resolves a point. */
export function nearestPlace(coords: Coordinates): Place {
  let best = PINCODE_INDEX[0];
  let bestKm = Number.POSITIVE_INFINITY;
  for (const place of PINCODE_INDEX) {
    const km = haversineKm(coords, place);
    if (km < bestKm) {
      bestKm = km;
      best = place;
    }
  }
  return { ...best, latitude: coords.latitude, longitude: coords.longitude };
}
