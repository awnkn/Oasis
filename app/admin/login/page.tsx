"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Login failed. Please try again.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 block text-center font-display text-3xl font-semibold"
        >
          Oasis <span className="text-oasis-500">·</span>{" "}
          <span className="text-oasis-600">Admin</span>
        </Link>
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-oasis-200"
        >
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            Your name
          </label>
          <input
            id="name"
            type="text"
            required
            minLength={2}
            maxLength={40}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="So we know who did what"
            className="w-full rounded-xl border border-oasis-200 bg-sand-50 px-4 py-3 outline-none transition focus:border-oasis-500 focus:ring-2 focus:ring-oasis-200"
          />
          <label htmlFor="password" className="mb-1.5 mt-4 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-oasis-200 bg-sand-50 px-4 py-3 outline-none transition focus:border-oasis-500 focus:ring-2 focus:ring-oasis-200"
          />
          {error && (
            <p className="mt-4 rounded-xl bg-blush-100 px-4 py-3 text-sm text-blush-500">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-full bg-oasis-600 px-6 py-3 font-medium text-white transition hover:bg-oasis-700 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-oasis-900/50">
          <Link href="/" className="hover:text-oasis-600">
            ← Back to the website
          </Link>
        </p>
      </div>
    </div>
  );
}
