"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Plus, Repeat, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/marketplace", label: "Explore", icon: Search },
  { href: "/sell", label: "Sell", icon: Plus, highlight: true },
  { href: "/rentals", label: "Rentals", icon: Repeat },
  { href: "/account", label: "Saved", icon: Heart },
];

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[55] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="flex items-stretch">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition",
                  active ? "text-brand-700" : "text-ink-500",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-xl transition",
                    tab.highlight
                      ? "bg-cash-500 text-ink-900 shadow-[0_8px_18px_-10px_rgba(245,158,11,0.9)]"
                      : active
                        ? "bg-brand-100 text-brand-700"
                        : "text-ink-500",
                  )}
                >
                  <tab.icon className="h-4.5 w-4.5" />
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
