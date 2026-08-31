"use client";

import { useEffect, useState } from "react";
import { formatDateShort, formatDateLong } from "@/lib/dates";
import type { CustomerProfile as Profile } from "@/lib/customers";

const STATUS_DOT: Record<string, string> = {
  checked_in: "bg-teal-600",
  confirmed: "bg-emerald-500",
  contacted: "bg-sky-500",
  follow_up: "bg-violet-500",
  no_response: "bg-amber-500",
  no_show: "bg-stone-500",
  wrong_number: "bg-zinc-400",
  cancelled: "bg-rose-500",
  cancelled_no_response: "bg-rose-400",
  open: "bg-slate-400",
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold tracking-tight ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

export default function CustomerProfile({
  phone,
  onClose,
  onSaved,
}: {
  phone: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [vip, setVip] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  useEffect(() => {
    if (!phone) return;
    setProfile(null);
    setError("");
    setLoading(true);
    fetch(`/api/admin/customers/${encodeURIComponent(phone)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const p: Profile = data.profile;
        setProfile(p);
        setNotes(p.notes ?? "");
        setTags(p.tags ?? []);
        setVip(p.vip);
      })
      .catch(() => setError("Could not load this customer."))
      .finally(() => setLoading(false));
  }, [phone]);

  async function save(next: { notes?: string | null; tags?: string[]; vip?: boolean }) {
    if (!phone) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(phone)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(d?.error || "Could not save.");
        return false;
      }
      setSavedNote(true);
      setTimeout(() => setSavedNote(false), 1500);
      onSaved();
      return true;
    } catch {
      setError("Could not reach the server.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    const next = [...new Set([...tags, t])].slice(0, 20);
    setTags(next);
    setTagInput("");
    save({ tags: next });
  }

  function removeTag(t: string) {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    save({ tags: next });
  }

  if (!phone) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-zinc-100 bg-white px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                {profile?.name ?? "Customer"}
              </h2>
              {vip && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-300">
                  ★ VIP
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500">{phone}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 px-6 py-5">
          {loading && <p className="text-sm text-zinc-400">Loading…</p>}
          {error && (
            <p className="rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-600">{error}</p>
          )}

          {profile && (
            <>
              {profile.email && (
                <p className="mb-4 text-sm text-zinc-500">{profile.email}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Stat label="Visits (checked in)" value={String(profile.visits)} tone="text-teal-600" />
                <Stat label="Total spent" value={`${profile.totalSpent} JOD`} tone="text-oasis-700" />
                <Stat label="Total bookings" value={String(profile.totalBookings)} />
                <Stat
                  label="No shows"
                  value={String(profile.noShows)}
                  tone={profile.noShows > 0 ? "text-rose-500" : ""}
                />
              </div>

              <p className="mt-3 text-xs text-zinc-400">
                {profile.firstSeen
                  ? `First seen ${formatDateShort(profile.firstSeen)} · last ${formatDateShort(profile.lastSeen!)}`
                  : ""}
              </p>

              {/* VIP toggle */}
              <label className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
                <span className="text-sm font-medium text-amber-800">Mark as VIP</span>
                <input
                  type="checkbox"
                  checked={vip}
                  disabled={saving}
                  onChange={(e) => {
                    setVip(e.target.checked);
                    save({ vip: e.target.checked });
                  }}
                  className="h-4 w-4 accent-amber-500"
                />
              </label>

              {/* Tags */}
              <div className="mt-5">
                <p className="mb-1.5 text-xs font-medium text-zinc-500">Tags</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="flex items-center gap-1 rounded-full bg-oasis-100 px-2.5 py-1 text-xs font-medium text-oasis-700"
                    >
                      {t}
                      <button
                        onClick={() => removeTag(t)}
                        aria-label={`Remove ${t}`}
                        className="text-oasis-500 hover:text-oasis-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add a tag…"
                    className="w-28 rounded-full border border-oasis-950/10 bg-white px-3 py-1 text-xs outline-none focus:border-oasis-950/25"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="mt-5">
                <p className="mb-1.5 text-xs font-medium text-zinc-500">
                  Notes {savedNote && <span className="text-emerald-600">· saved</span>}
                </p>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => {
                    if (notes !== (profile.notes ?? "")) save({ notes: notes || null });
                  }}
                  placeholder="Preferences, allergies, anything to remember…"
                  className="w-full rounded-xl border border-oasis-950/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-oasis-950/25"
                />
              </div>

              {/* History */}
              <div className="mt-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Visit history
                </p>
                <ul className="space-y-1.5">
                  {profile.history.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-100 px-3 py-2 text-sm"
                      title={formatDateLong(h.date)}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[h.guest_status] ?? "bg-slate-300"}`} />
                        {formatDateShort(h.date)}
                      </span>
                      <span className="text-zinc-500">
                        {h.guests} {h.guests === 1 ? "guest" : "guests"}
                      </span>
                      <span className="font-medium text-oasis-700">
                        {h.paid_amount ?? 0}/{h.total_price} JOD
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
