import Link from "next/link";
import { config } from "@/lib/config";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footerGrid">
        <div>
          <div className="footerTitle">{config.siteName}</div>
          <p className="muted">
            Tax filing assistant for Job Order (JO) and Contract of Service (COS) professionals.
          </p>
        </div>

        <div>
          <div className="footerTitle">Quick Links</div>
          <Link href="/services">Services</Link>
          <Link href="/how-it-works">How It Works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faqs">FAQs</Link>
        </div>

        <div>
          <div className="footerTitle">Policies</div>
          <Link href="/terms">Terms & Conditions</Link>
          <Link href="/refund-policy">Refund Policy</Link>
          <Link href="/privacy-policy">Privacy Policy</Link>
        </div>

        <div>
          <div className="footerTitle">Payments</div>
          <p className="muted">
            Secure checkout is powered by PayMongo. Complete payment by scanning QR Ph code with GCash, Maya, ShopeePay
            or Online Banking Apps.
          </p>
        </div>
      </div>

      <div
        className="footerBottom muted"
        style={{
          textAlign: "center",
          marginTop: 32,
          paddingTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: 13,
        }}
      >
        © {new Date().getFullYear()} {config.siteName}
      </div>

      <div
        className="muted"
        style={{
          textAlign: "center",
          marginTop: 8,
          fontSize: 12,
          opacity: 0.7,
          lineHeight: 1.6,
          maxWidth: 700,
          marginInline: "auto",
        }}
      >
        FileRight Solutions is operated by FileRight Document Facilitation Services,
        a document facilitation service registered with the Department of Trade and Industry (Philippines).
      </div>
    </footer>
  );
}