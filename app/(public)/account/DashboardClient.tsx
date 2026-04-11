// app/(public)/account/DashboardClient.tsx
"use client";

import { useMemo, useState } from "react";
import Bir1701AFormClient from "./Bir1701AFormClient";

type Props = {
  evaluationId: string;
  existingPayloadJson: string | null;

  // Optional (safe to pass later if you want)
  userName?: string | null;
  userEmail?: string | null;
};

type TabKey = "overview" | "evaluation" | "help";

function safeParse(json: string | null): any | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function computeHasDraft(parsed: any | null) {
  if (!parsed || typeof parsed !== "object") return false;

  // lightweight: if any string field has non-empty content, treat as started
  return Object.values(parsed).some((v) => {
    if (typeof v === "string") {
      const t = v.trim();
      return t !== "" && t !== "0.00";
    }
    return false;
  });
}

export default function DashboardClient({
  evaluationId,
  existingPayloadJson,
  userName,
  userEmail,
}: Props) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [showForm, setShowForm] = useState(false);

  const parsed = useMemo(() => safeParse(existingPayloadJson), [existingPayloadJson]);
  const hasDraft = useMemo(() => computeHasDraft(parsed), [parsed]);

  const status = hasDraft ? "Draft in progress" : "Not started";

  const displayName = (userName || "").trim() || "Client";

  const primaryLabel = useMemo(() => {
    if (tab === "evaluation") return showForm ? "Hide form" : "Open form";
    return hasDraft ? "Continue evaluation" : "Start evaluation";
  }, [tab, hasDraft, showForm]);

  const onPrimary = () => {
    if (tab !== "evaluation") {
      setTab("evaluation");
      setShowForm(true);
      return;
    }
    setShowForm((v) => !v);
  };

  return (
    <main style={page}>
      {/* Header */}
      <div style={header}>
        <div style={{ minWidth: 260 }}>
          <h1 style={h1}>Account Dashboard</h1>
          <div style={sub}>
            Signed in as <b style={{ color: "#0f172a" }}>{displayName}</b>
            {userEmail ? (
              <div style={{ marginTop: 2, fontSize: 13, color: "#64748b" }}>{userEmail}</div>
            ) : null}
          </div>
        </div>

        <div style={headerRight}>
          <div style={statusCard}>
            <div style={statusTop}>
              <div style={statusLabel}>Evaluation</div>
              <div style={statusValue}>{status}</div>
            </div>
            <div style={statusMeta}>
              ID: <span style={mono}>{evaluationId}</span>
            </div>
          </div>

          <button type="button" style={btnPrimary} onClick={onPrimary}>
            {primaryLabel}
          </button>

          <form method="post" action="/api/auth/logout">
            <button type="submit" style={btnSecondaryDanger}>
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Tabs */}
      <div style={tabs}>
        <Tab active={tab === "overview"} onClick={() => setTab("overview")}>
          Overview
        </Tab>
        <Tab
          active={tab === "evaluation"}
          onClick={() => {
            setTab("evaluation");
          }}
        >
          Evaluation
        </Tab>
        <Tab active={tab === "help"} onClick={() => setTab("help")}>
          Help
        </Tab>
      </div>

      {/* Content */}
      {tab === "overview" && (
        <section style={card}>
          <div style={sectionHeader}>
            <div>
              <h2 style={h2}>Overview</h2>
              <div style={muted}>
                Use this dashboard to complete your 1701A evaluation. Nothing is filed automatically.
              </div>
            </div>
          </div>

          <div style={notice}>
            <div style={noticeTitle}>How it works</div>
            <div style={noticeBody}>
              1) Enter details as previously filed. <br />
              2) Click <b>Save</b> anytime while editing. <br />
              3) Submit only when you’re ready to proceed.
            </div>
          </div>

          <div style={grid2}>
            <div style={tile}>
              <div style={tileTitle}>1701A Evaluation</div>
              <div style={tileValue}>{status}</div>
              <div style={tileMeta}>
                Evaluation ID: <span style={mono}>{evaluationId}</span>
              </div>

              <div style={tileActions}>
                <button
                  type="button"
                  style={btnPrimary}
                  onClick={() => {
                    setTab("evaluation");
                    setShowForm(true);
                  }}
                >
                  {hasDraft ? "Continue" : "Start"}
                </button>

                <button
                  type="button"
                  style={btnSecondary}
                  onClick={() => {
                    setTab("evaluation");
                    setShowForm(false);
                  }}
                >
                  View instructions
                </button>
              </div>
            </div>

            <div style={tile}>
              <div style={tileTitle}>Before submitting</div>
              <div style={tileValue}>Review key details</div>
              <div style={tileMeta}>
                If you are unsure about any field (TIN/RDO/ATC/name/address), save your draft first and contact support
                before submitting.
              </div>

              <div style={tileActions}>
                <button type="button" style={btnSecondary} onClick={() => setTab("help")}>
                  Open help
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === "evaluation" && (
        <section style={card}>
          <div style={sectionHeader}>
            <div>
              <h2 style={h2}>1701A Evaluation</h2>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                style={btnSecondary}
                onClick={() => setShowForm((v) => !v)}
              >
                {showForm ? "Hide form" : "Open form"}
              </button>

              <button
                type="button"
                style={btnPrimary}
                onClick={() => setShowForm(true)}
              >
                {hasDraft ? "Continue editing" : "Start filling out"}
              </button>
            </div>
          </div>

          <div style={notice}>
            <div style={noticeTitle}>Before you begin</div>
            <div style={noticeBody}>
              Please enter information exactly as previously filed. Use <b>Save</b> anytime while editing.
            </div>
          </div>

          {!showForm ? (
            <div style={{ marginTop: 12, color: "#475569", lineHeight: 1.7 }}>
              Click <b>Open form</b> when you’re ready.
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <Bir1701AFormClient evaluationId={evaluationId} existingPayloadJson={existingPayloadJson} />
            </div>
          )}
        </section>
      )}

      {tab === "help" && (
        <section style={card}>
          <div style={sectionHeader}>
            <div>
              <h2 style={h2}>Help</h2>
              <div style={muted}>Common questions about saving and submitting your evaluation.</div>
            </div>
          </div>

          <div style={faq}>
            <div style={faqItem}>
              <div style={faqQ}>Does “Save” file anything with BIR?</div>
              <div style={faqA}>
                No. Save only stores your draft on your account so you can continue later.
              </div>
            </div>

            <div style={faqItem}>
              <div style={faqQ}>When should I submit?</div>
              <div style={faqA}>
                Submit only when you have reviewed key details (TIN/RDO/ATC/name/address and amounts).
              </div>
            </div>

            <div style={faqItem}>
              <div style={faqQ}>What if I’m unsure about a field?</div>
              <div style={faqA}>
                Save your draft first. If anything looks incorrect, do not submit yet—contact support for guidance.
              </div>
            </div>
          </div>

          <div style={mutedBox}>
            <div style={mutedBoxTitle}>Support</div>
            <div style={muted}>
              If you want, you can add a visible support email/number here later (neutral, no sales language).
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: any;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...tabBtn,
        ...(active ? tabBtnActive : null),
      }}
    >
      {children}
    </button>
  );
}

/* ---------------- styles ---------------- */

const page: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "48px 0",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const headerRight: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "flex-end",
};

const h1: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  letterSpacing: -0.2,
};

const sub: React.CSSProperties = {
  marginTop: 8,
  color: "#475569",
  lineHeight: 1.5,
  fontSize: 14,
};

const statusCard: React.CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  gap: 4,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "white",
  minWidth: 240,
};

const statusTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "baseline",
};

const statusLabel: React.CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: 0.2,
};

const statusValue: React.CSSProperties = {
  color: "#0f172a",
  fontWeight: 900,
};

const statusMeta: React.CSSProperties = {
  color: "#64748b",
  fontSize: 12,
};

const tabs: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 18,
};

const tabBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 999,
  border: "1px solid #e2e8f0",
  background: "white",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const tabBtnActive: React.CSSProperties = {
  background: "#1e40af",
  color: "white",
  border: "1px solid #1e40af",
};

const card: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
  background: "white",
  marginTop: 14,
};

const sectionHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const h2: React.CSSProperties = {
  fontSize: 18,
  margin: 0,
};

const muted: React.CSSProperties = {
  color: "#475569",
  fontSize: 13,
  marginTop: 6,
  lineHeight: 1.5,
};

const notice: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  borderRadius: 14,
  padding: 12,
  color: "#0f172a",
  lineHeight: 1.6,
};

const noticeTitle: React.CSSProperties = {
  fontWeight: 900,
  marginBottom: 6,
};

const noticeBody: React.CSSProperties = {
  fontSize: 14,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 12,
};

const tile: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 14,
  background: "#fff",
};

const tileTitle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  fontWeight: 900,
  letterSpacing: 0.2,
  textTransform: "uppercase",
};

const tileValue: React.CSSProperties = {
  marginTop: 8,
  fontSize: 18,
  fontWeight: 900,
  color: "#0f172a",
};

const tileMeta: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: "#64748b",
  lineHeight: 1.5,
};

const tileActions: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const faq: React.CSSProperties = {
  marginTop: 12,
  display: "grid",
  gap: 12,
};

const faqItem: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 12,
  background: "white",
};

const faqQ: React.CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
};

const faqA: React.CSSProperties = {
  marginTop: 6,
  color: "#475569",
  lineHeight: 1.6,
};

const mutedBox: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 12,
  background: "white",
};

const mutedBoxTitle: React.CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 6,
};

const mono: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 12,
};

const btnPrimary: React.CSSProperties = {
  background: "#1e40af",
  color: "white",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 900,
  border: "1px solid #1e40af",
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  background: "white",
  color: "#0f172a",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 900,
  border: "1px solid #e2e8f0",
  cursor: "pointer",
};

const btnSecondaryDanger: React.CSSProperties = {
  background: "white",
  color: "#b91c1c",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 900,
  border: "1px solid #fecaca",
  cursor: "pointer",
};