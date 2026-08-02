"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  who: "user" | "bot";
  text: string;
}

const SUGGESTIONS = [
  "How many bookings today?",
  "How much did we collect yesterday?",
  "How many spots are left tomorrow?",
  "Any cancellations this week?",
  "Summary of last week",
];

/**
 * Floating "Ask Oasis" helper for the dashboard. Every answer comes from
 * the booking database on this server — no AI service, nothing online.
 */
export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { who: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json().catch(() => null);
      setMessages((m) => [
        ...m,
        {
          who: "bot",
          text: res.ok
            ? (data?.answer ?? "Sorry — something went wrong.")
            : (data?.error ?? "Sorry — something went wrong."),
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { who: "bot", text: "Could not reach the server — try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex max-h-[min(34rem,calc(100vh-8rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10">
          <div className="border-b border-zinc-100 bg-oasis-950 px-5 py-4 text-white">
            <p className="text-sm font-semibold tracking-tight">Oasis assistant</p>
            <p className="mt-0.5 text-xs text-white/60">
              Answers come only from your booking system — nothing online.
            </p>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div>
                <p className="px-1 text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Try asking
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="rounded-full border border-oasis-950/10 px-3 py-1.5 text-left text-xs text-oasis-800 transition hover:bg-oasis-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) =>
              m.who === "user" ? (
                <p
                  key={i}
                  className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-oasis-600 px-3.5 py-2 text-sm text-white"
                >
                  {m.text}
                </p>
              ) : (
                <p
                  key={i}
                  className="mr-6 w-fit whitespace-pre-line rounded-2xl rounded-bl-md bg-zinc-100 px-3.5 py-2 text-sm text-zinc-800"
                >
                  {m.text}
                </p>
              )
            )}
            {busy && (
              <p className="mr-6 w-fit rounded-2xl rounded-bl-md bg-zinc-100 px-3.5 py-2 text-sm text-zinc-400">
                Looking it up…
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2 border-t border-zinc-100 px-3 py-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about bookings, money, check-ins…"
              maxLength={300}
              className="min-w-0 flex-1 rounded-xl border border-oasis-950/10 bg-white px-3 py-2 text-sm outline-none focus:border-oasis-950/25"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-xl bg-oasis-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-oasis-700 disabled:opacity-40"
            >
              Ask
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-oasis-950 px-5 py-3 text-sm font-medium text-white shadow-xl transition hover:bg-oasis-800"
      >
        {open ? (
          "Close"
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Ask Oasis
          </>
        )}
      </button>
    </>
  );
}
