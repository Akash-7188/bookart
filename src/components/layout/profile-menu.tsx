"use client";

import * as React from "react";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpenCheck,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Package,
  Repeat,
  ShieldCheck,
  Store,
  User,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui";
import { signOutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/types";
import { inr } from "@/lib/rental";
import { cn } from "@/lib/utils";

export function ProfileMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
            Sign in
          </Button>
        </Link>
        <Link href="/signup">
          <Button size="sm">Sign up</Button>
        </Link>
      </div>
    );
  }

  const links = [
    { href: "/orders", label: "My orders", icon: Package },
    { href: "/rentals", label: "My rentals & deposits", icon: Repeat },
    { href: "/account", label: "Profile & wallet", icon: User },
    { href: "/sell", label: "List an item", icon: Store },
    { href: "/seller", label: "Seller dashboard", icon: LayoutDashboard },
  ];
  if (user.role === "admin") links.push({ href: "/admin", label: "Admin console", icon: ShieldCheck });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-brand-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: user.avatarColor ?? "#4f46e5" }}
        >
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-24 truncate text-xs font-bold text-ink-900 sm:block">
          {user.name.split(" ")[0]}
        </span>
        <ChevronDown className={cn("hidden h-3.5 w-3.5 text-ink-500 transition sm:block", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-lift)]"
        >
          <div className="border-b border-slate-100 bg-slate-50/70 p-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
              {user.name}
              {user.verifiedSeller ? <BadgeCheck className="h-4 w-4 text-brand-600" /> : null}
            </p>
            <p className="truncate text-xs text-ink-500">{user.email}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ink-700 ring-1 ring-slate-200">
                <Wallet className="h-3 w-3 text-emerald-600" /> {inr(user.walletBalance)} wallet
              </span>
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold capitalize text-brand-700">
                {user.role}
              </span>
            </div>
            {user.verification.status === "pending" ? (
              <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800 ring-1 ring-amber-200">
                Seller verification pending — you can list items but badges activate after approval.
              </p>
            ) : null}
          </div>
          <ul className="p-1.5">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <form action={signOutAction} className="border-t border-slate-100 p-1.5">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
          <div className="border-t border-slate-100 px-3 py-2">
            <p className="flex items-center gap-1.5 text-[10px] text-ink-500">
              <BookOpenCheck className="h-3 w-3" /> Buy · Rent · Sell — hyperlocal
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
