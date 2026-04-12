import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { config } from "@/lib/config";
import { getAuthedUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const seoSubtitle =
  config.siteName.trim().toLowerCase() === config.brandName.trim().toLowerCase()
    ? "Tax filing assistance for JO & COS professionals"
    : config.siteName;

export const metadata = {
  title: {
    default: `${config.brandName} — ${seoSubtitle}`,
    template: `${config.brandName} — %s`,
  },
  description: "Tax Filing Assistance for JO & COS Professionals",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const signedIn = !!getAuthedUserId();

  return (
    <>
      <Header signedIn={signedIn} />
      <div className="publicSiteShell">{children}</div>
      <Footer />
    </>
  );
}
