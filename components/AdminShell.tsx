"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Role = "manager" | "staff";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  managerOnly?: boolean;
}

const I = {
  home: (
    <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
  ),
  gate: <><path d="M4 21V5a1 1 0 0 1 1-1h9l6 4v13" /><path d="M9 21v-6h5v6" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 19a6 6 0 0 1 12 0" /><path d="M16 5.5a3 3 0 0 1 0 5.4" /><path d="M17 13.5a6 6 0 0 1 4 5.5" /></>,
  cash: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></>,
  ticket: <><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 8 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-8Z" /><path d="M13 6v12" /></>,
};

function icon(children: React.ReactNode) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: icon(I.home) },
  { href: "/admin/gate", label: "Gate check-in", icon: icon(I.gate) },
  { href: "/admin/customers", label: "Customers", icon: icon(I.users) },
  { href: "/admin/close", label: "Cash close", icon: icon(I.cash), managerOnly: true },
  { href: "/admin/insights", label: "Insights", icon: icon(I.chart), managerOnly: true },
  { href: "/admin/activity", label: "Activity log", icon: icon(I.clock), managerOnly: true },
  { href: "/admin/events", label: "Events", icon: icon(I.ticket) },
];

export default function AdminShell({
  role,
  children,
  maxWidthClass = "max-w-[100rem]",
}: {
  role: Role;
  children: React.ReactNode;
  /** Content max-width, so wide dashboards and narrow reports share the shell. */
  maxWidthClass?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => !n.managerOnly || role === "manager");

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    router.push("/admin/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            isActive(n.href)
              ? "bg-oasis-600 text-white"
              : "text-oasis-100/80 hover:bg-white/10 hover:text-white"
          }`}
        >
          {n.icon}
          {n.label}
        </Link>
      ))}
    </nav>
  );

  const sidebarInner = (
    <div className="flex h-full flex-col gap-4 p-4">
      <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-2 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-white.png" alt="Oasis by Azara" className="h-8 w-auto" />
      </Link>
      <span className="mx-2 w-fit rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/80">
        {role === "manager" ? "Manager" : "Staff"}
      </span>
      {nav}
      <button
        onClick={logout}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 17l-5-5 5-5M5 12h11" />
        </svg>
        Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Mobile / tablet top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-oasis-950/10 text-oasis-900"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-black.png" alt="Oasis by Azara" className="h-7 w-auto" />
        <span className="rounded-full bg-oasis-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-oasis-700">
          {role === "manager" ? "Mgr" : "Staff"}
        </span>
      </div>

      {/* Fixed sidebar (desktop / iPad landscape) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 bg-oasis-950 lg:block">
        {sidebarInner}
      </aside>

      {/* Slide-in drawer (phone / iPad portrait) */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-oasis-950 transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarInner}
      </aside>

      {/* Content */}
      <div className="lg:pl-64">
        <main className={`mx-auto ${maxWidthClass} px-4 pb-24 pt-6 sm:px-6 lg:px-8`}>
          {children}
        </main>
      </div>
    </div>
  );
}
