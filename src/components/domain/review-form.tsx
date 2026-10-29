"use client";

import * as React from "react";
import { Star, ThumbsUp } from "lucide-react";
import { Button, Textarea } from "@/components/ui";
import { reviewSellerAction } from "@/app/actions/marketplace";
import { cn } from "@/lib/utils";

export function ReviewForm({ productId, signedIn }: { productId: string; signedIn: boolean }) {
  const [score, setScore] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [state, setState] = React.useState<{ ok?: boolean; message?: string }>({});
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    setBusy(true);
    const res = await reviewSellerAction(productId, score, comment);
    setBusy(false);
    setState(
      res.ok
        ? { ok: true, message: "Thanks! Your rating is now visible to other buyers." }
        : { ok: false, message: res.error ?? "Could not save the rating." },
    );
    if (res.ok) setComment("");
  }

  if (!signedIn) {
    return (
      <p className="rounded-xl bg-slate-50 p-3 text-xs text-ink-600 ring-1 ring-slate-200">
        Sign in to rate the seller and help other students in your area.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-bold text-ink-900">Rate this seller</p>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setScore(n)}
            aria-label={`${n} star`}
            className="transition hover:scale-110"
          >
            <Star className={cn("h-6 w-6", n <= score ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
          </button>
        ))}
        <span className="ml-1 text-xs font-bold text-ink-700">{score}/5</span>
      </div>
      <Textarea
        className="mt-2 min-h-20 text-sm"
        placeholder="How was the condition, packing and handover?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-ink-500">Ratings feed the seller reputation score.</p>
        <Button size="sm" loading={busy} onClick={submit} disabled={comment.trim().length < 4}>
          <ThumbsUp className="h-3.5 w-3.5" /> Post rating
        </Button>
      </div>
      {state.message ? (
        <p className={cn("mt-2 text-[11px] font-semibold", state.ok ? "text-emerald-700" : "text-rose-600")}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
