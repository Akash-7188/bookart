import Link from "next/link";
import { BookOpen, Github, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white pb-24 pt-8 md:pb-8">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="font-serif text-lg font-bold text-ink-900">Bookart</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            A hyperlocal marketplace for books, notes and study material. Buy from a shop 2 km away, rent a semester
            guide with a refundable deposit, or sell what you've finished.
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
            <ShieldCheck className="h-3 w-3" /> Deposits held in escrow
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Categories</p>
          <ul className="mt-3 space-y-2 text-sm">
            {CATEGORIES.map((cat) => (
              <li key={cat.slug}>
                <Link href={`/marketplace?category=${cat.slug}`} className="text-ink-700 transition hover:text-brand-700">
                  {cat.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Bookart</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/sell" className="text-ink-700 hover:text-brand-700">Sell / list an item</Link></li>
            <li><Link href="/seller" className="text-ink-700 hover:text-brand-700">Seller dashboard</Link></li>
            <li><Link href="/rentals" className="text-ink-700 hover:text-brand-700">Rental & deposit policy</Link></li>
            <li><Link href="/orders" className="text-ink-700 hover:text-brand-700">Track orders</Link></li>
            <li><Link href="/admin" className="text-ink-700 hover:text-brand-700">Admin console</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Support</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-700">
            <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> 1800-123-BOOKART</li>
            <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> help@bookart.in</li>
            <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Sector 3, Pithampur, MP 454775</li>
            <li className="flex items-center gap-2"><Github className="h-3.5 w-3.5" /> Deployment guide in README</li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-slate-100 px-4 pt-4 text-xs text-ink-500 sm:px-6">
        © {new Date().getFullYear()} Bookart Marketplace. Demo build — mock inventory, simulated payments and refunds.
      </div>
    </footer>
  );
}
