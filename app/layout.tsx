import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/site/NavigationProgress";

/** Icons: `app/icon.png` and `app/apple-icon.png` are picked up automatically by Next.js (better for Google favicon). */

/** Sets absolute URLs for Open Graph / Twitter when SITE_BASE_URL is your live domain. */
export async function generateMetadata(): Promise<Metadata> {
  const base = process.env.SITE_BASE_URL?.trim();
  if (!base?.startsWith("http")) {
    return {};
  }
  try {
    return {
      metadataBase: new URL(base.replace(/\/+$/, "")),
    };
  } catch {
    return {};
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
