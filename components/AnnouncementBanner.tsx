"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Rotating announcement strip shown at the very top of the public site
 * (above each page's header). Hidden on the admin dashboard. Content is
 * fetched fresh from /api/banner so edits from the dashboard appear on the
 * next page load. Rotates through the messages when there is more than one.
 */
export default function AnnouncementBanner() {
  const pathname = usePathname();
  const hidden = pathname?.startsWith("/admin") ?? false;

  const [messages, setMessages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (hidden) return;
    let cancelled = false;
    fetch("/api/banner")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.enabled || !Array.isArray(data.messages)) return;
        const clean = data.messages.filter(
          (m: unknown): m is string => typeof m === "string" && m.trim().length > 0
        );
        setMessages(clean);
        setIndex(0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hidden]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((p) => (p + 1) % messages.length);
        setVisible(true);
      }, 300);
    }, 5000);
    return () => clearInterval(id);
  }, [messages.length]);

  if (hidden || messages.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Site announcement"
      className="relative z-40 bg-oasis-950 text-white"
    >
      <div className="mx-auto flex min-h-[2.75rem] max-w-6xl items-center justify-center px-6 py-2 text-center text-sm font-medium">
        <p className={`transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
          {messages[index % messages.length]}
        </p>
      </div>
    </div>
  );
}
