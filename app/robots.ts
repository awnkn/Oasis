import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Allow event hero images (served from /api/events/{id}/hero) so
        // Google rich results and social link previews can load them; the
        // more specific allow overrides the broad /api/ block.
        allow: ["/", "/api/events/"],
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
