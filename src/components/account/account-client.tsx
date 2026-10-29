"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Building2, Home, Landmark, MapPin, Save, ShieldAlert, Wallet } from "lucide-react";
import { Badge, Button, Card, FieldError, Input, Label, RadioTile, SectionHeader, Stat } from "@/components/ui";
import { becomeSellerAction, updateProfileAction } from "@/app/actions/auth";
import { inr } from "@/lib/rental";
import { SELLER_KIND_LABEL } from "@/lib/constants";
import type { SellerKind, SessionUser } from "@/lib/types";

export function AccountClient({
  user,
  stats,
  refunds,
}: {
  user: SessionUser;
  stats: { orders: number; rentals: number; activeRentals: number; escrow: number; saved: number };
  refunds: { id: string; amount: number; at?: string; note: string }[];
}) {
  const router = useRouter();
  const [profile, setProfile] = React.useState({
    name: user.name,
    phone: "",
    address: "",
    city: user.city ?? "",
    pincode: user.pincode ?? "",
  });
  const [profileState, setProfileState] = React.useState<{ ok?: boolean; message?: string }>({});
  const [profileBusy, setProfileBusy] = React.useState(false);

  const [sellerKind, setSellerKind] = React.useState<SellerKind>(user.sellerKind);
  const [gstin, setGstin] = React.useState(user.verification.gstin ?? "");
  const [registrationId, setRegistrationId] = React.useState(user.verification.registrationId ?? "");
  const [upgradeState, setUpgradeState] = React.useState<{ ok?: boolean; message?: string }>({});
  const [upgradeBusy, setUpgradeBusy] = React.useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileBusy(true);
    const res = await updateProfileAction({ userId: user.id, ...profile });
    setProfileBusy(false);
    setProfileState(res.ok ? { ok: true, message: "Profile updated." } : { ok: false, message: res.error });
    if (res.ok) router.refresh();
  }

  async function submitUpgrade(e: React.FormEvent) {
    e.preventDefault();
    setUpgradeBusy(true);
    const res = await becomeSellerAction({
      userId: user.id,
      sellerKind,
      gstin: gstin || undefined,
      registrationId: registrationId || undefined,
      address: profile.address || undefined,
      city: profile.city,
      pincode: profile.pincode,
    });
    setUpgradeBusy(false);
    setUpgradeState(
      res.ok
        ? {
            ok: true,
            message:
              sellerKind === "individual"
                ? "Individual seller verified — you can list right away."
                : "Documents submitted. Trust & Safety reviews within 24 h.",
          }
        : { ok: false, message: res.error },
    );
    if (res.ok) router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-5">
      <SectionHeader
        title="Your account"
        description="Profile, wallet, verification status and the deposit ledger tied to your rentals."
        action={
          <Link href="/sell">
            <Button size="sm">List an item</Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Wallet balance" value={inr(user.walletBalance)} tone="emerald" icon={<Wallet className="h-4 w-4" />} hint="Refunds land here first" />
        <Stat label="Orders" value={stats.orders} hint={`${stats.saved} items in cart`} />
        <Stat label="Rentals" value={stats.rentals} tone="brand" hint={`${stats.activeRentals} active`} />
        <Stat label="Deposit in escrow" value={inr(stats.escrow)} tone="cash" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <p className="text-sm font-extrabold text-ink-900">Profile</p>
          <p className="text-[11px] text-ink-500">
            {user.email} · joined {new Date().toISOString().slice(0, 4)} ·{" "}
            <span className="capitalize">{user.role}</span>
          </p>

          <form onSubmit={saveProfile} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="acc-name">Name / organisation</Label>
              <Input id="acc-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="acc-phone">Phone</Label>
              <Input id="acc-phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="98xxx xxxxx" />
            </div>
            <div>
              <Label htmlFor="acc-city">City</Label>
              <Input id="acc-city" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="acc-address">Delivery address</Label>
              <Input id="acc-address" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder="House / street / area" />
            </div>
            <div>
              <Label htmlFor="acc-pincode">Pincode</Label>
              <Input id="acc-pincode" value={profile.pincode} onChange={(e) => setProfile({ ...profile, pincode: e.target.value })} />
            </div>
            <div className="flex items-end">
              <Button type="submit" full loading={profileBusy}>
                <Save className="h-4 w-4" /> Save profile
              </Button>
            </div>
          </form>
          {profileState.message ? (
            <p className={`mt-2 text-[11px] font-semibold ${profileState.ok ? "text-emerald-700" : "text-rose-600"}`}>
              {profileState.message}
            </p>
          ) : null}

          <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
              <MapPin className="h-3.5 w-3.5" /> Location used for radius search
            </p>
            <p className="mt-1 text-xs text-ink-600">
              {user.city ?? "—"} {user.pincode ?? ""} ·{" "}
              {user.latitude?.toFixed(4) ?? "—"}, {user.longitude?.toFixed(4) ?? "—"}
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4" id="seller-upgrade">
            <p className="text-sm font-extrabold text-ink-900">Seller status & verification</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={user.verifiedSeller ? "emerald" : user.verification.status === "pending" ? "amber" : "slate"}>
                {user.verifiedSeller ? (
                  <>
                    <BadgeCheck className="h-3 w-3" /> Verified
                  </>
                ) : (
                  `Verification: ${user.verification.status}`
                )}
              </Badge>
              <Badge tone="slate">{SELLER_KIND_LABEL[user.sellerKind]}</Badge>
            </div>
            {user.verification.note ? (
              <p className="mt-2 rounded-lg bg-slate-50 p-2 text-[11px] text-ink-600 ring-1 ring-slate-200">
                {user.verification.note}
              </p>
            ) : null}

            <form onSubmit={submitUpgrade} className="mt-3 space-y-3">
              <div>
                <Label>Sell as</Label>
                <div className="grid gap-2">
                  <RadioTile
                    checked={sellerKind === "individual"}
                    onChange={() => setSellerKind("individual")}
                    title="Individual seller"
                    subtitle="Free listing · KYC auto-approved"
                    icon={<Home className="h-4 w-4 text-brand-600" />}
                  />
                  <RadioTile
                    checked={sellerKind === "bookstore"}
                    onChange={() => setSellerKind("bookstore")}
                    title="Registered bookstore"
                    subtitle="GSTIN + shop licence · bulk listing"
                    icon={<Building2 className="h-4 w-4 text-brand-600" />}
                  />
                  <RadioTile
                    checked={sellerKind === "library"}
                    onChange={() => setSellerKind("library")}
                    title="Registered library"
                    subtitle="Lending ledger + deposit tracking"
                    icon={<Landmark className="h-4 w-4 text-brand-600" />}
                  />
                </div>
              </div>

              {sellerKind === "bookstore" ? (
                <div>
                  <Label htmlFor="acc-gstin">GSTIN</Label>
                  <Input id="acc-gstin" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="23AABCS1429P1ZQ" />
                </div>
              ) : null}
              {sellerKind !== "individual" ? (
                <div>
                  <Label htmlFor="acc-reg">Registration / licence ID</Label>
                  <Input id="acc-reg" value={registrationId} onChange={(e) => setRegistrationId(e.target.value)} placeholder="MP/LIB/IND/2014/0772" />
                </div>
              ) : null}

              <Button type="submit" full variant="outline" loading={upgradeBusy}>
                <ShieldAlert className="h-4 w-4" /> Submit for verification
              </Button>
              <FieldError>{upgradeState.ok ? undefined : upgradeState.message}</FieldError>
              {upgradeState.ok ? (
                <p className="text-[11px] font-semibold text-emerald-700">{upgradeState.message}</p>
              ) : null}
            </form>
          </Card>

          <Card className="p-4">
            <p className="text-sm font-extrabold text-ink-900">Deposit & refund ledger</p>
            <p className="text-[11px] text-ink-500">Every credit that came back from escrow.</p>
            <ul className="mt-3 divide-y divide-slate-100">
              {refunds.map((refund) => (
                <li key={refund.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink-900">{refund.note}</p>
                    <p className="text-[10px] text-ink-500">
                      {refund.at ? new Date(refund.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-emerald-700">+{inr(refund.amount)}</span>
                </li>
              ))}
              {!refunds.length ? (
                <li className="py-3 text-xs text-ink-500">No refunds yet — they appear here once a return is verified.</li>
              ) : null}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
