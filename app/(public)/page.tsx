// app/(public)/page.tsx

import Link from "next/link";
import { getAuthedUserId } from "@/lib/auth";

export default function HomePage() {
  const signedIn = !!getAuthedUserId();
  const evaluationCtaHref = signedIn ? "/account?tab=evaluation" : "/login";

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px" }}>
      {/* HERO */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 28,
          alignItems: "start",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily:
                'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
              fontSize: "clamp(28px, 3.8vw, 36px)",
              lineHeight: 1.2,
              margin: "0 0 28px",
              letterSpacing: -0.3,
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            Amend Your BIR Form 1701A
            <br />
            — Correctly and Legally
          </h1>

          <p
            style={{
              marginTop: 0,
              fontSize: 16,
              lineHeight: 1.6,
              color: "#334155",
              maxWidth: 680,
            }}
          >
            Specialized tax filing assistance for <b>Job Order (JO)</b> and{" "}
            <b>Contract of Service (COS)</b> professionals. We review your filed{" "}
            <b>1701A</b>, identify legally available deduction opportunities,
            and assist in preparing amended returns when correction is beneficial.
          </p>

          <p style={{ marginTop: 10, fontSize: 14, color: "#475569" }}>
            Transparent. Structured. Fully compliant with BIR rules.
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
            <Link
              href={evaluationCtaHref}
              style={{
                background: "#1e40af",
                color: "white",
                padding: "12px 18px",
                borderRadius: 12,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Check If Your 1701A Needs Correction
            </Link>

            <Link
              href="/how-it-works"
              style={{
                background: "white",
                color: "#0f172a",
                padding: "12px 18px",
                borderRadius: 12,
                fontWeight: 700,
                border: "1px solid #e2e8f0",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              How It Works
            </Link>
          </div>
        </div>

        {/* WHAT YOU'LL RECEIVE */}
        <aside
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 18,
            background: "#f8fafc",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16 }}>What you’ll receive</h3>

          <ul
            style={{
              marginTop: 10,
              marginBottom: 0,
              paddingLeft: 18,
              color: "#334155",
              lineHeight: 1.7,
            }}
          >
            <li>Structured recomputation & analysis (original vs corrected)</li>
            <li>Eligibility review under current BIR rules</li>
            <li>Clear scope and deliverables</li>
            <li>Amended 1701A preparation and filing (when justified)</li>
          </ul>
        </aside>
      </section>

      {/* VALUE STRIP */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          marginTop: 28,
        }}
      >
        <Card
          title="Secure Document Handling"
          desc="Private uploads with restricted access and controlled workflow."
        />
        <Card
          title="Structured Service Policy"
          desc="Clear, documented service structure aligned with transparent computation."
        />
        <Card
          title="Compliance-Focused Process"
          desc="All analysis and amendments are aligned with applicable BIR rules."
        />
      </section>

      {/* WHO THIS IS FOR */}
      <section style={{ marginTop: 44 }}>
        <h2 style={{ fontSize: 26, marginBottom: 14 }}>Who This Service Is For</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          <Card
            title="Job Order (JO)"
            desc="Government-paid professionals who must file their own income tax returns and may have overpaid due to unoptimized filing."
          />
          <Card
            title="Contract of Service (COS)"
            desc="Independent contractors needing structured assistance with annual filing and compliance."
          />
          <Card
            title="Government-paid Professionals"
            desc="Engineers, IT staff, consultants, health workers, project-based hires, and similar roles without dedicated accounting support."
          />
        </div>
      </section>

      {/* WHAT WE DO */}
      <section style={{ marginTop: 44 }}>
        <h2 style={{ fontSize: 26, marginBottom: 10 }}>What We Do</h2>

        <p
          style={{
            marginTop: 0,
            color: "#334155",
            lineHeight: 1.7,
            maxWidth: 900,
          }}
        >
          We specialize in reviewing previously filed <b>BIR Form 1701A</b> and
          assisting with correction when legally appropriate. This is not tax
          evasion. This is proper application of existing tax regulations.
        </p>

        <ul
          style={{
            marginTop: 10,
            paddingLeft: 18,
            color: "#334155",
            lineHeight: 1.8,
          }}
        >
          <li>Recompute income tax based on declared income and filing details</li>
          <li>Review applicable deduction methods under current BIR rules</li>
          <li>Identify legally available deduction opportunities</li>
          <li>Assess whether an amended filing is beneficial and justified</li>
          <li>Prepare amended 1701A documentation with guidance notes</li>
        </ul>

        <p style={{ marginTop: 12, color: "#475569" }}>
          You receive a complete computation breakdown before any amendment is filed.
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ marginTop: 44 }}>
        <h2 style={{ fontSize: 26, marginBottom: 10 }}>How It Works</h2>

        <ol
          style={{
            paddingLeft: 18,
            color: "#0f172a",
            lineHeight: 1.8,
          }}
        >
          <li>
            <b>Create an account for secure processing</b>
            <div style={{ color: "#475569" }}>
              Required for document handling, tracking, and referral benefits.
            </div>
          </li>

          <li>
            <b>Submit your filed 1701A and income details</b>
            <div style={{ color: "#475569" }}>
              We securely review your existing filing and declared information.
            </div>
          </li>

          <li>
            <b>We perform a structured recomputation</b>
            <div style={{ color: "#475569" }}>
              Your return is recalculated under current BIR regulations to ensure accuracy and determine whether your tax can be legally reduced.
            </div>
          </li>

          <li>
            <b>You receive a clear, side-by-side analysis</b>
            <div style={{ color: "#475569" }}>
              We present the original computation versus corrected figures so you
              can clearly see the difference.
            </div>
          </li>

          <li>
            <b>If justified, we assist with amended preparation</b>
            <div style={{ color: "#475569" }}>
              Complete amended 1701A preparation and filing.
          </div>
          </li>
        </ol>
      </section>

      {/* DISCLAIMER */}
      <section
        style={{
          marginTop: 44,
          borderTop: "1px solid #e2e8f0",
          paddingTop: 18,
        }}
      >
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.7 }}>
          We do not create fake expenses or fabricate claims. We assist with
          lawful recomputation and correction strictly within existing BIR rules,
          supported by documentation.
        </p>
      </section>
    </main>
  );
}

/* =========================
   Card Component
========================= */

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 16,
        background: "white",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
      <div style={{ color: "#475569", lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}