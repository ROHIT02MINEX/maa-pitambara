import type { MetadataRoute } from "next";

/** Only the publicly reachable marketing/auth pages belong in the sitemap. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const lastModified = new Date();

  return [
    { url: `${base}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/login`, lastModified, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/signup`, lastModified, changeFrequency: "yearly", priority: 0.5 },
  ];
}
