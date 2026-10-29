import { cookies } from "next/headers";
import { getSessionUser } from "./db";
import { createClient } from "./supabase/server";
import type { SessionUser } from "./types";

export const SESSION_COOKIE = "bookart_session";
export const LOCATION_COOKIE = "bookart_location";
export const GUEST_COOKIE = "bookart_guest";

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** Reads the signed-in user from the session cookie (Server Components & Actions). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError?.name === "AuthSessionMissingError") return null;
    if (authError) throw authError;
    if (!authData.user) return null;

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id,name,email,role,seller_kind,wallet_balance,verified_seller,avatar_color,rating,ratings_count,latitude,longitude,city,pincode,verification_status,verification_note")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return null;

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      sellerKind: profile.seller_kind,
      walletBalance: Number(profile.wallet_balance),
      verifiedSeller: profile.verified_seller,
      avatarColor: profile.avatar_color ?? "#4f46e5",
      rating: Number(profile.rating),
      ratingsCount: profile.ratings_count,
      latitude: profile.latitude ?? undefined,
      longitude: profile.longitude ?? undefined,
      city: profile.city ?? undefined,
      pincode: profile.pincode ?? undefined,
      verification: {
        status: profile.verification_status,
        note: profile.verification_note ?? undefined,
      },
    };
  }

  const store = await cookies();
  return getSessionUser(store.get(SESSION_COOKIE)?.value);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You need to sign in to continue.");
  return user;
}

/** Null-returning variant for server actions that report errors instead of throwing. */
export async function getCurrentUserSafe(): Promise<SessionUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export interface StoredLocation {
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  label: string;
  source: "gps" | "manual" | "default";
}

export const DEFAULT_LOCATION: StoredLocation = {
  city: "Pithampur",
  pincode: "454775",
  latitude: 22.6197,
  longitude: 75.6926,
  label: "Pithampur, MP",
  source: "default",
};

export async function getStoredLocation(): Promise<StoredLocation> {
  const store = await cookies();
  const raw = store.get(LOCATION_COOKIE)?.value;
  if (!raw) return DEFAULT_LOCATION;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as StoredLocation;
    if (Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude)) return parsed;
  } catch {
    /* fall through to default */
  }
  return DEFAULT_LOCATION;
}

/** Guest cart key: the user id when signed in, otherwise a cookie-scoped guest id. */
export async function getCartKey(user?: SessionUser | null): Promise<string> {
  if (user) return user.id;
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value ?? "guest_demo";
}
