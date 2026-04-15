import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { NavigationProgress } from "@/components/site/NavigationProgress";

/** Icons: `app/icon.png` and `app/apple-icon.png` are picked up automatically; `public/favicon.ico` serves Google’s usual probe. */

/** Canonical site URL for icons / Open Graph when `SITE_BASE_URL` is unset (e.g. use `VERCEL_URL` on Vercel). */
export async function generateMetadata(): Promise<Metadata> {
  const raw =
    process.env.SITE_BASE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "";

  const base = raw.startsWith("http") ? raw.replace(/\/+$/, "") : "";

  const out: Metadata = {
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon.png", type: "image/png", sizes: "32x32" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
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
