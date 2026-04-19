import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { config } from "@/lib/config";
import { getAuthedUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const seoSubtitle = (() => {
  const lower = config.siteName.trim().toLowerCase();
  const brandLower = config.brandName.trim().toLowerCase();
  if (lower === brandLower) return "Tax filing assistance for JO & COS professionals";
  // SERP wording: "Assistant" reads better in the title bar than "Assistance" for the same tagline.
  return config.siteName.replace(/\bAssistance\b/gi, "Assistant");
})();

export const metadata = {
  title: {
    default: `${config.brandName} — ${seoSubtitle}`,
    template: `${config.brandName} — %s`,
  },
  description: "Tax filing assistant for JO & COS professionals — amend your BIR Form 1701A correctly and legally.",
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
