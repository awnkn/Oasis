import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { listUpcomingEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/book`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/events`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  let eventRoutes: MetadataRoute.Sitemap = [];
  try {
    eventRoutes = listUpcomingEvents().map((e) => ({
      url: `${SITE_URL}/events/${e.slug}`,
      lastModified: e.hero_updated_at ? new Date(`${e.hero_updated_at}Z`) : now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    eventRoutes = [];
  }

  return [...staticRoutes, ...eventRoutes];
}
