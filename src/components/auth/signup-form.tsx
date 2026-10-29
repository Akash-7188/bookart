"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Home, Landmark, MapPin, ShieldCheck, UserPlus } from "lucide-react";
import { Button, Card, FieldError, FieldHint, Input, Label, RadioTile, Select } from "@/components/ui";
import { GoogleMark } from "./login-form";
import { googleAuthAction, signUpAction } from "@/app/actions/auth";
import { signUpSchema } from "@/lib/auth-schema";
import { GENDERS, OCCUPATIONS } from "@/lib/constants";
import { z } from "zod";

type SignUpValues = z.input<typeof signUpSchema>;
type SellerKind = "individual" | "bookstore" | "library";

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [sellerKind, setSellerKind] = React.useState<SellerKind>("individual");
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      occupation: "Student",
      age: 20,
      gender: "Prefer not to say",
      address: "",
      pincode: "",
      sellerKind: "individual",
      gstin: "",
      registrationId: "",
    },
  });

  async function submit(data: SignUpValues) {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await signUpAction({ ...data, sellerKind });
    setBusy(false);
    if (res.ok) {
      if (res.data?.requiresEmailConfirmation) {
        setMessage(res.message ?? "Check your email to confirm your account before signing in.");
        return;
      }
      router.push(next);
      router.refresh();
    } else {
      setError(res.error ?? "Could not create the account");
    }
  }

  async function google() {
    setBusy(true);
    const res = await googleAuthAction("signup");
    setBusy(false);
    if (res.ok) {
      if (res.data?.url) {
        window.location.assign(res.data.url);
        return;
      }
      router.push(next);
      router.refresh();
    } else {
      setError(res.error ?? "Google sign-up failed");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="p-5 sm:p-7">
        <h1 className="font-serif text-2xl font-bold text-ink-900">Create your Bookart account</h1>
        <p className="mt-1 text-sm text-ink-600">
          Buy and rent nearby, list your own shelf, or register your shop / library for verified selling.
        </p>

        <Button variant="outline" full className="mt-4" onClick={google} loading={busy}>
          <GoogleMark /> Sign up with Google
        </Button>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-500">or fill the form</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div>
            <Label>I'm signing up as</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              <RadioTile
                checked={sellerKind === "individual"}
                onChange={() => { setSellerKind("individual"); form.setValue("sellerKind", "individual"); }}
                title="Individual"
                subtitle="Buy, rent, sell from home"
                icon={<Home className="h-4 w-4 text-brand-600" />}
              />
              <RadioTile
                checked={sellerKind === "bookstore"}
                onChange={() => { setSellerKind("bookstore"); form.setValue("sellerKind", "bookstore"); }}
                title="Bookstore"
                subtitle="GSTIN required"
                icon={<Building2 className="h-4 w-4 text-brand-600" />}
              />
              <RadioTile
                checked={sellerKind === "library"}
                onChange={() => { setSellerKind("library"); form.setValue("sellerKind", "library"); }}
                title="Library"
                subtitle="Registration ID required"
                icon={<Landmark className="h-4 w-4 text-brand-600" />}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">{sellerKind === "individual" ? "Full name" : "Organisation name"} *</Label>
              <Input id="name" placeholder={sellerKind === "individual" ? "Priya Nair" : "Nalanda Books & Stationery"} {...form.register("name")} />
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="signup-email">Email *</Label>
              <Input id="signup-email" type="email" placeholder="you@example.com" {...form.register("email")} />
              <FieldError>{form.formState.errors.email?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" inputMode="tel" placeholder="98765 43210" {...form.register("phone")} />
              <FieldError>{form.formState.errors.phone?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="signup-password">Password *</Label>
              <Input id="signup-password" type="password" autoComplete="new-password" placeholder="min 8 characters" {...form.register("password")} />
              <FieldError>{form.formState.errors.password?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="occupation">Occupation *</Label>
              <Select id="occupation" {...form.register("occupation")}>
                {OCCUPATIONS.map((occupation) => (
                  <option key={occupation} value={occupation}>
                    {occupation}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="age">Age *</Label>
              <Input id="age" inputMode="numeric" {...form.register("age")} />
              <FieldError>{form.formState.errors.age?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="gender">Gender *</Label>
              <Select id="gender" {...form.register("gender")}>
                {GENDERS.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
            <div>
              <Label htmlFor="address">Default address *</Label>
              <Input id="address" placeholder="House / street / area" {...form.register("address")} />
              <FieldError>{form.formState.errors.address?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="signup-pincode">Pincode *</Label>
              <Input id="signup-pincode" inputMode="numeric" placeholder="454775" {...form.register("pincode")} />
              <FieldError>{form.formState.errors.pincode?.message}</FieldError>
            </div>
          </div>

          {sellerKind !== "individual" ? (
            <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-brand-900">
                <ShieldCheck className="h-4 w-4" /> Verification documents
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {sellerKind === "bookstore" ? (
                  <div>
                    <Label htmlFor="gstin">GSTIN *</Label>
                    <Input id="gstin" placeholder="23AABCS1429P1ZQ" {...form.register("gstin")} />
                    <FieldError>{form.formState.errors.gstin?.message}</FieldError>
                  </div>
                ) : null}
                <div>
                  <Label htmlFor="registrationId">Registration / licence ID {sellerKind === "library" ? "*" : ""}</Label>
                  <Input id="registrationId" placeholder="MP/LIB/IND/2014/0772" {...form.register("registrationId")} />
                  <FieldError>{form.formState.errors.registrationId?.message}</FieldError>
                </div>
              </div>
              <FieldHint>
                Reviewed within 24 h by Bookart Trust & Safety. You can list immediately; the verified badge activates on
                approval.
              </FieldHint>
            </div>
          ) : null}

          <FieldError>{error}</FieldError>
          {message && <p className="text-sm font-medium text-emerald-700" role="status">{message}</p>}

          <Button type="submit" full loading={busy} variant="cash">
            <UserPlus className="h-4 w-4" /> Create account
          </Button>

          <p className="text-center text-[11px] text-ink-500">
            By continuing you agree to Bookart's rental deposit policy: deposits are held in escrow and refunded after the
            seller verifies the returned item.
          </p>
        </form>

        <p className="mt-4 text-center text-xs text-ink-500">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-brand-700 underline">
            Sign in
          </Link>
        </p>
      </Card>

      <div className="space-y-4">
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
            <MapPin className="h-3.5 w-3.5" /> Why we ask for your address
          </p>
          <p className="mt-2 text-xs text-ink-600">
            Your pincode + coordinates power the radius search. Buyers within 5/10/25 km see your listings first, and
            distance labels ("2.4 km away") are computed from these coordinates using the Haversine formula.
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Role upgrades</p>
          <ul className="mt-2 space-y-1.5 text-xs text-ink-600">
            <li>• Everyone starts as a buyer. Listing an item upgrades you to seller.</li>
            <li>• Bookstores add a GSTIN; libraries add a registration ID.</li>
            <li>• Admins are provisioned internally (see the admin@bookart.in demo).</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
