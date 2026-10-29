"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Button, Card, FieldError, Input, Label } from "@/components/ui";
import { googleAuthAction, signInAction } from "@/app/actions/auth";
import { DEMO_ACCOUNTS } from "@/lib/seed-data";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signInAction({ email, password });
    setBusy(false);
    if (res.ok) {
      router.push(next);
      router.refresh();
    } else {
      setError(res.error ?? "Could not sign in");
    }
  }

  async function google() {
    setBusy(true);
    const res = await googleAuthAction("signin");
    setBusy(false);
    if (res.ok) {
      if (res.data?.url) {
        window.location.assign(res.data.url);
        return;
      }
      router.push(next);
      router.refresh();
    } else {
      setError(res.error ?? "Google sign-in failed");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="p-5 sm:p-7">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-white">
          <BookOpen className="h-6 w-6" />
        </span>
        <h1 className="mt-3 font-serif text-2xl font-bold text-ink-900">Welcome back to Bookart</h1>
        <p className="mt-1 text-sm text-ink-600">
          Sign in to track orders, manage rentals and keep your deposit ledger in one place.
        </p>

        <Button variant="outline" full className="mt-4" onClick={google} loading={busy}>
          <GoogleMark /> Continue with Google
        </Button>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-500">or use email</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="pl-9"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="pl-9"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <FieldError>{error}</FieldError>
          <Button type="submit" full loading={busy}>
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-500">
          New to Bookart?{" "}
          <Link href="/signup" className="font-bold text-brand-700 underline">
            Create an account
          </Link>
        </p>
      </Card>

      <div className="space-y-4">
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
            <ShieldCheck className="h-3.5 w-3.5" /> One-click demo accounts
          </p>
          <ul className="mt-3 space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    setError(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50/60"
                >
                  <p className="text-sm font-bold text-ink-900">{account.label}</p>
                  <p className="text-[11px] text-ink-500">{account.hint}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-ink-500">{account.email} · {account.password}</p>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-ink-500">
            Fills the form — press Sign in to continue. The demo password for seeded accounts is{" "}
            <span className="font-mono">demo1234</span>.
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">What you get</p>
          <ul className="mt-2 space-y-1.5 text-xs text-ink-600">
            <li>• Rental dashboard with due dates and escrow status.</li>
            <li>• Seller console: listings, inspections, payouts.</li>
            <li>• Wallet refunds the instant a return is verified.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}
