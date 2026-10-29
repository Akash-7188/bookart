"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronRight, Menu, Store, X } from "lucide-react";
import { Badge } from "@/components/ui";
import { CartDrawer } from "./cart-drawer";
import { LocationPicker } from "./location-picker";
import { ProfileMenu } from "./profile-menu";
import { SearchBar } from "./search-bar";
import { CATEGORIES } from "@/lib/constants";
import type { SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SiteHeader({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const [mobileMenu, setMobileMenu] = React.useState(false);

  return (
    <header className="sticky top-0 z-[60] border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white shadow-[0_8px_20px_-10px_rgba(79,70,229,0.9)]">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-serif text-lg font-bold tracking-tight text-ink-900">Bookart</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-600">Buy · Rent · Sell</span>
          </span>
        </Link>

        <div className="hidden lg:block">
          <LocationPicker />
        </div>

        <div className="min-w-0 flex-1">
          <SearchBar />
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/sell"
            className="hidden items-center gap-1.5 rounded-xl bg-cash-500 px-3 py-2 text-sm font-bold text-ink-900 transition hover:bg-cash-600 md:inline-flex"
          >
            <Store className="h-4 w-4" /> Sell
          </Link>
          <CartDrawer />
          <ProfileMenu user={user} />
          <button
            type="button"
            onClick={() => setMobileMenu((v) => !v)}
            className="rounded-xl p-2 text-ink-700 transition hover:bg-brand-50 lg:hidden"
            aria-label="Menu"
          >
            {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Location row on tablet/mobile */}
      <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-1.5 lg:hidden">
        <LocationPicker />
        <span className="ml-auto hidden text-[11px] text-ink-500 sm:block">
          {user ? `Signed in as ${user.name}` : "Guest browsing"}
        </span>
      </div>

      {/* Category rail */}
      <nav className="no-scrollbar flex items-center gap-2 overflow-x-auto border-t border-slate-100 px-3 py-2 sm:px-5">
        <Link
          href="/marketplace"
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition",
            pathname === "/marketplace" ? "bg-brand-600 text-white" : "bg-slate-100 text-ink-700 hover:bg-brand-100",
          )}
        >
          All listings
        </Link>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/marketplace?category=${cat.slug}`}
            className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 ring-1 ring-slate-200 transition hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200"
          >
            <span className="mr-1">{cat.emoji}</span>
            {cat.short}
          </Link>
        ))}
        <Link
          href="/sell"
          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-cash-600 ring-1 ring-amber-200 transition hover:bg-amber-50 md:hidden"
        >
          + List an item
        </Link>
      </nav>

      {mobileMenu ? (
        <div className="border-t border-slate-200 bg-white p-3 lg:hidden">
          <div className="grid gap-1.5">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/marketplace?category=${cat.slug}`}
                onClick={() => setMobileMenu(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-800 transition hover:bg-brand-50"
              >
                <span>
                  <span className="mr-2">{cat.emoji}</span>
                  {cat.label}
                </span>
                <ChevronRight className="h-4 w-4 text-ink-500" />
              </Link>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <Badge tone="brand">Books</Badge>
            <Badge tone="amber">Handwritten notes</Badge>
            <Badge tone="emerald">Libraries</Badge>
            <Badge tone="sky">Bookstores</Badge>
          </div>
        </div>
      ) : null}
    </header>
  );
}
