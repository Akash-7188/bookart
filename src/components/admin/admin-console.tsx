"use client";

import * as React from "react";
import { Building2, CheckCircle2, Landmark, XCircle } from "lucide-react";
import { Badge, Button, Card, Textarea } from "@/components/ui";
import { reviewVerificationAction } from "@/app/actions/marketplace";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

export function VerificationQueue({ users }: { users: User[] }) {
  const [rows, setRows] = React.useState(users);
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<Record<string, string>>({});

  async function decide(userId: string, approve: boolean) {
    setBusy(userId);
    const res = await reviewVerificationAction(userId, approve, notes[userId]);
    setBusy(null);
    if (res.ok) {
      setRows((prev) => prev.filter((row) => row.id !== userId));
      setMessage((prev) => ({
        ...prev,
        [userId]: approve ? "Approved — verified badge is now live." : "Rejected — seller notified.",
      }));
    } else {
      setMessage((prev) => ({ ...prev, [userId]: res.error ?? "Action failed" }));
    }
  }

  return (
    <Card className="p-4">
      <p className="text-sm font-extrabold text-ink-900">Seller verification queue ({rows.length})</p>
      <p className="text-[11px] text-ink-500">
        Registered bookstores need a GSTIN; libraries need a registration ID. Individuals are auto-approved.
      </p>

      <ul className="mt-3 space-y-3">
        {rows.map((user) => (
          <li key={user.id} className="rounded-2xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {user.name.slice(0, 1)}
                </span>
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink-900">
                    {user.name}
                    <Badge tone={user.sellerKind === "library" ? "emerald" : "sky"}>
                      {user.sellerKind === "library" ? (
                        <>
                          <Landmark className="h-3 w-3" /> Library
                        </>
                      ) : (
                        <>
                          <Building2 className="h-3 w-3" /> Bookstore
                        </>
                      )}
                    </Badge>
                  </p>
                  <p className="text-[11px] text-ink-500">
                    {user.email} · {user.phone} · {user.city} {user.pincode}
                  </p>
                  <ul className="mt-1.5 space-y-0.5 text-[11px] text-ink-600">
                    {user.verification.gstin ? (
                      <li>
                        GSTIN: <span className="font-mono font-semibold">{user.verification.gstin}</span>
                      </li>
                    ) : null}
                    {user.verification.registrationId ? (
                      <li>
                        Registration ID: <span className="font-mono font-semibold">{user.verification.registrationId}</span>
                      </li>
                    ) : null}
                    <li>Submitted: {user.verification.submittedAt ? new Date(user.verification.submittedAt).toLocaleString("en-IN") : "—"}</li>
                    {user.verification.note ? <li>Note: {user.verification.note}</li> : null}
                  </ul>
                </div>
              </div>
              <div className="w-full sm:w-64">
                <Textarea
                  className="min-h-16 text-xs"
                  placeholder="Reviewer note (optional)"
                  value={notes[user.id] ?? ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [user.id]: e.target.value }))}
                />
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="success" full loading={busy === user.id} onClick={() => decide(user.id, true)}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="danger" full loading={busy === user.id} onClick={() => decide(user.id, false)}>
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
                {message[user.id] ? (
                  <p className={cn("mt-1.5 text-[11px] font-semibold", message[user.id].startsWith("Approved") ? "text-emerald-700" : "text-rose-600")}>
                    {message[user.id]}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
        {!rows.length ? (
          <li className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 ring-1 ring-emerald-200">
            Queue is clear — every registered shop and library has been reviewed.
          </li>
        ) : null}
      </ul>
    </Card>
  );
}
