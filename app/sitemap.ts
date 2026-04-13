import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = String(config.baseUrl).replace(/\/$/, "");
  const now = new Date();

  const paths = [
    "/",
    "/about",
    "/services",
    "/how-it-works",
    "/pricing",
    "/faqs",
    "/contact",
    "/privacy-policy",
    "/terms",
    "/refund-policy",
    "/register",
  ];

  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
