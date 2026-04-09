import "../globals.css";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { config } from "@/lib/config";
import { getAuthedUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: config.siteName,
  description: "Tax Filing Assistance for JO & COS Professionals"
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const signedIn = !!getAuthedUserId();

  return (
    <html lang="en">
      <body>
        <Header signedIn={signedIn} />
        <div className="publicSiteShell">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
