import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

/**
 * Keep search engines out of admin + API + checkout-return pages.
 * Until launch we also let NEXT_PUBLIC_ROBOTS=block emit a blanket
 * disallow so a misconfigured preview environment can't accidentally
 * get indexed.
 */
export default function robots(): MetadataRoute.Robots {
  const blockAll = process.env.NEXT_PUBLIC_ROBOTS === "block";

  if (blockAll) {
    return {
      rules:   { userAgent: "*", disallow: "/" },
      sitemap: `${SITE_URL}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow:     "/",
      disallow:  ["/admin", "/admin/", "/api/", "/success", "/cancel"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host:    SITE_URL,
  };
}
