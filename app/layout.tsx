import "./globals.css";
import type { Metadata } from "next";

const siteIcons: Metadata["icons"] = {
  icon: "/icon.png",
  apple: "/apple-icon.png",
};

/** Sets absolute URLs for Open Graph / Twitter when SITE_BASE_URL is your live domain. */
export async function generateMetadata(): Promise<Metadata> {
  const base = process.env.SITE_BASE_URL?.trim();
  if (!base?.startsWith("http")) {
    return { icons: siteIcons };
  }
  try {
    return {
      metadataBase: new URL(base.replace(/\/+$/, "")),
      icons: siteIcons,
    };
  } catch {
    return { icons: siteIcons };
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
