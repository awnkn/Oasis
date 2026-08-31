// Client-safe helper (no database imports) so both server pages and the
// admin client component can build an event's hero-image URL the same way.

/** Cache-busting URL for an event's hero image, or null if none uploaded. */
export function eventHeroUrl(e: {
  id: number;
  hero_updated_at: string | null;
}): string | null {
  return e.hero_updated_at
    ? `/api/events/${e.id}/hero?v=${encodeURIComponent(e.hero_updated_at)}`
    : null;
}
