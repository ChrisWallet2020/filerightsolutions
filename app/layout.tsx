import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { NavigationProgress } from "@/components/site/NavigationProgress";

/**
 * Icons: `app/favicon.ico` and `app/icon.png` follow Next.js file conventions.
 * `generateMetadata` also emits explicit links so crawlers (e.g. Google favicon) get stable URLs.
 */

/** Canonical site URL for icons / Open Graph when `SITE_BASE_URL` is unset (e.g. use `VERCEL_URL` on Vercel). */
export async function generateMetadata(): Promise<Metadata> {
  const raw =
    process.env.SITE_BASE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "";

  const base = raw.startsWith("http") ? raw.replace(/\/+$/, "") : "";

  const faviconUrl = base ? `${base}/favicon.ico` : "/favicon.ico";
  const pngIconUrl = base ? `${base}/icon.png` : "/icon.png";
  const appleUrl = base ? `${base}/apple-icon.png` : "/apple-icon.png";

  const out: Metadata = {
    icons: {
      icon: [
        { url: faviconUrl, sizes: "any" },
        { url: pngIconUrl, type: "image/png", sizes: "32x32" },
        { url: pngIconUrl, type: "image/png", sizes: "48x48" },
      ],
      shortcut: faviconUrl,
      apple: [{ url: appleUrl, sizes: "180x180", type: "image/png" }],
    },
  };

  if (base) {
    try {
      out.metadataBase = new URL(base);
    } catch {
      /* ignore */
    }
  }

  return out;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MetaPixel />
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
