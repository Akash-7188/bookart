"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { becomeSellerSchema, profileSchema, signInSchema, signUpSchema } from "@/lib/auth-schema";
import {
  createSession,
  createUser,
  destroySession,
  findUserByEmail,
  findUserById,
  submitSellerVerification,
  updateUser,
  verifyPassword,
} from "@/lib/db";
import { findPlaceByPincode, nearestPlace } from "@/lib/geo";
import { getCurrentUserSafe, SESSION_COOKIE } from "@/lib/session";
import type { SellerKind } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  message?: string;
  data?: T;
}

const AVATAR_COLORS = ["#4f46e5", "#0ea5e9", "#14b8a6", "#f59e0b", "#ec4899", "#8b5cf6"];

async function startSession(userId?: string) {
  const token = createSession(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function signUpAction(raw: unknown): Promise<ActionResult<{ userId: string; requiresEmailConfirmation?: boolean }>> {
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const input = parsed.data;

  if (!input.gstin && input.sellerKind !== "individual") {
    return { ok: false, error: "GSTIN is required for a registered bookstore." };
  }
  if (!input.registrationId && input.sellerKind === "library") {
    return { ok: false, error: "Library registration ID is required for a lending library." };
  }

  try {
    const isOrg = input.sellerKind !== "individual";
    const place = findPlaceByPincode(input.pincode) ?? nearestPlace({ latitude: 22.6197, longitude: 75.6926 });
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
          data: {
            name: input.name,
            phone: input.phone,
            occupation: input.occupation,
            age: input.age,
            gender: input.gender,
            address: input.address,
            pincode: input.pincode,
            city: place.city,
            latitude: place.latitude,
            longitude: place.longitude,
            role: isOrg ? "seller" : "buyer",
            seller_kind: input.sellerKind,
            verification_status: isOrg ? "pending" : "none",
            gstin: input.gstin?.trim().toUpperCase(),
            registration_id: input.registrationId,
          },
        },
      });
      if (error) return { ok: false, error: error.message };
      if (!data.user) return { ok: false, error: "Supabase did not return a user account." };
      if (!data.session) {
        return {
          ok: true,
          data: { userId: data.user.id, requiresEmailConfirmation: true },
          message: "Check your email to confirm your account before signing in.",
        };
      }
      return { ok: true, data: { userId: data.user.id } };
    }

    const user = await createUser({
      name: input.name,
      email: input.email,
      password: input.password,
      phone: input.phone,
      occupation: input.occupation,
      age: input.age,
      gender: input.gender,
      address: input.address,
      pincode: input.pincode,
      city: nearestPlace({ latitude: 22.6197, longitude: 75.6926 }).city,
      role: isOrg ? "seller" : "buyer",
      sellerKind: input.sellerKind as SellerKind,
      avatarColor: AVATAR_COLORS[0],
      verification: isOrg
        ? {
            status: "pending",
            gstin: input.gstin,
            registrationId: input.registrationId,
            submittedAt: new Date().toISOString(),
            note: "Documents queued for Bookart verification",
          }
        : { status: "none" },
    });
    // Address → coordinates (in production a geocoder; here the pincode index).
    await updateUser(user.id, {
      latitude: place.latitude,
      longitude: place.longitude,
      city: place.city,
    });
    await startSession(user.id);
    return { ok: true, data: { userId: user.id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not create the account" };
  }
}

export async function signInAction(raw: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      return {
        ok: false,
        error: error.message === "Invalid login credentials"
          ? "Email or password is incorrect."
          : error.message,
      };
    }
    return { ok: true };
  }

  const user = findUserByEmail(parsed.data.email);
  if (!user) return { ok: false, error: "No Bookart account found for this email." };
  if (!verifyPassword(parsed.data.password, user.passwordHash)) {
    return { ok: false, error: "Incorrect password. Try again." };
  }
  await startSession(user.id);
  return { ok: true };
}

/**
 * Google OAuth entry point.
 *
 * In production this redirects to Google's consent screen and the callback
 * creates/links the account (see README → Auth). Without OAuth credentials in
 * the sandbox we complete a *mock* Google handshake so the flow is walkable.
 */
export async function googleAuthAction(intent: "signin" | "signup" = "signin"): Promise<ActionResult<{ url: string }>> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
      },
    });
    if (error) return { ok: false, error: error.message };
    if (!data.url) return { ok: false, error: "Supabase did not return an OAuth redirect URL." };
    return { ok: true, data: { url: data.url } };
  }

  const demoEmail = intent === "signup" ? "new.google.user@bookart.in" : "buyer@bookart.in";
  let user = findUserByEmail(demoEmail);
  if (!user) {
    user = await createUser({
      name: intent === "signup" ? "Google User" : "Priya Nair",
      email: demoEmail,
      provider: "google",
      occupation: "Student",
      age: 22,
      gender: "Prefer not to say",
      address: "Vijay Nagar",
      city: "Indore",
      pincode: "452010",
    });
  }
  await startSession(user.id);
  return { ok: true };
}

export async function signOutAction() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    redirect("/");
  }
  const store = await cookies();
  await destroySession(store.get(SESSION_COOKIE)?.value);
  store.delete(SESSION_COOKIE);
  redirect("/");
}

export async function becomeSellerAction(raw: unknown): Promise<ActionResult> {
  const parsed = becomeSellerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check the verification details" };
  const { userId, ...rest } = parsed.data;
  const payload = { ...rest, gstin: rest.gstin ? rest.gstin.trim().toUpperCase() : undefined };

  if (payload.sellerKind === "bookstore" && !payload.gstin) {
    return { ok: false, error: "GSTIN is required to list as a registered bookstore." };
  }
  if (payload.sellerKind === "library" && !payload.registrationId) {
    return { ok: false, error: "Registration ID is required to list as a library." };
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const user = await getCurrentUserSafe();
    if (!user || user.id !== userId) return { ok: false, error: "Please sign in to update this profile." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("submit_seller_verification", {
      p_seller_kind: payload.sellerKind,
      p_gstin: payload.gstin ?? "",
      p_registration_id: payload.registrationId ?? "",
      p_address: payload.address ?? "",
      p_city: payload.city ?? "",
      p_pincode: payload.pincode ?? "",
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  await submitSellerVerification(userId, payload);
  return { ok: true };
}

export async function updateProfileAction(raw: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check the profile fields" };
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const user = await getCurrentUserSafe();
    if (!user || user.id !== parsed.data.userId) return { ok: false, error: "Please sign in to update this profile." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_bookart_profile", {
      p_name: parsed.data.name,
      p_phone: parsed.data.phone ?? "",
      p_address: parsed.data.address ?? "",
      p_city: parsed.data.city ?? "",
      p_pincode: parsed.data.pincode ?? "",
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const user = findUserById(parsed.data.userId);
  if (!user) return { ok: false, error: "User not found" };
  await updateUser(user.id, parsed.data);
  return { ok: true };
}
