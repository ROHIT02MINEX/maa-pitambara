import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup"],
        // Everything behind authentication is private.
        disallow: ["/api/", "/admin", "/dashboard", "/learn", "/tests", "/progress", "/profile", "/onboarding"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
