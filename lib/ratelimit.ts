// Tiny in-process rate limiter (sliding window). The app runs as a single
// instance, so an in-memory counter is enough to blunt brute-force logins
// and automated form spam. Not a distributed limiter — intentionally simple.

const hits = new Map<string, number[]>();

export interface RateResult {
  ok: boolean;
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  // Occasional cleanup so the map can't grow without bound.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }

  if (recent.length >= limit) {
    hits.set(key, recent);
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000));
    return { ok: false, retryAfterSec };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true, retryAfterSec: 0 };
}

/** Best-effort client IP from the proxy headers (Render sets X-Forwarded-For).
 * We take the RIGHT-most entry — the address the platform's own proxy saw the
 * request arrive from. The left-most values are supplied by the client and
 * can be spoofed to slip past the rate limiter, so they are never trusted. */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return request.headers.get("x-real-ip") || "unknown";
}
