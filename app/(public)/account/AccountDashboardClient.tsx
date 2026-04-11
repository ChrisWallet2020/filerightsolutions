"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Bir1701AFormClient from "./Bir1701AFormClient";

type Props = {
  userFullName: string;
  userEmail: string;

  evaluationId: string;
  evaluationStatus: string;
  existingPayloadJson: string | null;

  referralLink: string;
  credited: number;

  /** e.g. from `?tab=evaluation` when landing from the home CTA */
  initialTab?: "overview" | "evaluation" | "referral";
};

function safeParse(json: string | null): any | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function formatStatus(hasDraft: boolean) {
  return hasDraft ? "In Progress" : "Not started";
}

function normalizeInitialTab(
  t: Props["initialTab"]
): "overview" | "evaluation" | "referral" {
  if (t === "evaluation" || t === "referral" || t === "overview") return t;
  return "overview";
}

export default function AccountDashboardClient({
  userFullName,
  userEmail,
  evaluationId,
  evaluationStatus,
  existingPayloadJson,
  referralLink,
  credited,
  initialTab,
}: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "evaluation" | "referral">(() =>
    normalizeInitialTab(initialTab)
  );
  const [savedPayloadJson, setSavedPayloadJson] = useState<string | null>(existingPayloadJson);

  const parsed = useMemo(() => safeParse(savedPayloadJson), [savedPayloadJson]);

  const hasDraft = useMemo(() => {
    if (!parsed || typeof parsed !== "object") return false;
    return Object.values(parsed).some(
      (v) => typeof v === "string" && v.trim() !== "" && v.trim() !== "0.00"
    );
  }, [parsed]);

  const isCompleted =
    evaluationStatus === "SUBMITTED" ||
    evaluationStatus === "IN_REVIEW" ||
    evaluationStatus === "DONE";
  const status = isCompleted ? "Completed" : formatStatus(hasDraft);
  const statusColor = status === "In Progress" ? "#16a34a" : "#0f172a";

  return (
    <div style={page}>
      {/* Header */}
      <div style={headerWrap}>
        <div>
          <p style={headerEyebrow}>Client workspace</p>
          <h1 style={headerTitle}>Account dashboard</h1>
          <div style={headerUser}>
            <span style={headerUserName}>{userFullName}</span>
            <span style={headerUserSep} aria-hidden>
              ·
            </span>
            <span style={headerUserEmail}>{userEmail}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={tabRow}>
        <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
          Overview
        </TabButton>
        <TabButton
          active={activeTab === "evaluation"}
          onClick={() => {
            setActiveTab("evaluation");
          }}
        >
          Evaluation
        </TabButton>
        <TabButton active={activeTab === "referral"} onClick={() => setActiveTab("referral")}>
          Referral
        </TabButton>
      </div>

      {/* Body */}
      {activeTab === "overview" && (
        <section style={{ ...card, marginTop: 20 }}>
          <div style={sectionHeader}>
            <h2 style={sectionTitle}>Overview</h2>
          </div>

          <div style={notice}>
            <div style={noticeTitle}>How this works</div>
            <ol style={noticeList}>
              <li>
                Fill out the evaluation form <strong>exactly as previously filed</strong>.
              </li>
              <li>
                Click <strong>Save</strong> anytime while editing.
              </li>
              <li>Submit only when you’re ready to proceed.</li>
            </ol>
          </div>

          <div style={grid2}>
            <div
              style={{
                ...tile,
                ...(isCompleted ? tileHighlightEval : {}),
              }}
            >
              <div style={tileTitle}>1701A evaluation</div>
              <div style={{ ...tileValue, color: statusColor }}>{status}</div>
              <div style={tileMeta}>
                Evaluation ID: <span style={mono}>{evaluationId}</span>
              </div>
            </div>

            <div style={{ ...tile, ...tileHighlightRef }}>
              <div style={tileTitle}>Referral</div>
              <div style={tileValue}>{credited}</div>
              <div style={tileMeta}>Confirmed credits from completed evaluations</div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "evaluation" && (
        <section style={{ ...card, marginTop: 20 }}>
          <div style={sectionHeader}>
            <h2 style={sectionTitle}>Free 1701A evaluation</h2>
          </div>

          <div style={notice}>
            <div style={noticeTitle}>Before you begin</div>
            <div style={noticeBody}>
              Please enter details exactly as previously filed (same TIN, RDO, ATC, name, address, etc.). Use{" "}
              <strong>Save</strong> anytime while editing.
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Bir1701AFormClient
              evaluationId={evaluationId}
              existingPayloadJson={savedPayloadJson}
              evaluationStatus={evaluationStatus}
              onPayloadSaved={setSavedPayloadJson}
            />
          </div>
        </section>
      )}

      {activeTab === "referral" && (
        <section style={{ ...card, marginTop: 20 }}>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>Referral link</h2>
              <div style={mutedSmall}>Optional — share with another JO/COS professional.</div>
            </div>
          </div>

          <div style={notice}>
            <div style={noticeTitle}>How referral credit works</div>
            <div style={noticeBody}>
              <p style={referralNoticeMain}>
                {
                  "Every person who uses your link and completes the free evaluation earns you one credit. On quoted bills, one credit reduces your service fee by 10%; maximum of one credit per client. Please note that if your billing email was already issued before the credit was added to your account, the reduction may not be reflected in that billing. Simply resubmit your evaluation to receive an updated billing."
                }
              </p>
              <p style={referralNoticeSub}>
                The referred client does not need to purchase anything for you to earn the credit.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={label}>Your referral link</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input readOnly value={referralLink} style={inputStyle} />
              <button
                type="button"
                className="btn"
                onClick={() => navigator.clipboard.writeText(referralLink)}
              >
                Copy link
              </button>
            </div>

            <div style={{ marginTop: 12, color: "#475569" }}>
              Confirmed referral credits: <b style={{ color: "#0f172a" }}>{credited}</b>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
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

/* ---------- styles ---------- */

const page: React.CSSProperties = {
  maxWidth: 920,
  margin: "0 auto",
  padding: "36px 20px 56px",
};

const headerWrap: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const headerEyebrow: React.CSSProperties = {
  margin: "0 0 6px",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#64748b",
};

const headerTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 30,
  lineHeight: 1.15,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: "#0f172a",
};

const headerUser: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "6px 8px",
  fontSize: 14,
  lineHeight: 1.5,
  color: "#475569",
};

const headerUserName: React.CSSProperties = {
  fontWeight: 600,
  color: "#0f172a",
};

const headerUserSep: React.CSSProperties = {
  color: "#cbd5e1",
  userSelect: "none",
};

const headerUserEmail: React.CSSProperties = {
  fontSize: 14,
  color: "#64748b",
};

const tabRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 22,
};

const tabBtn: React.CSSProperties = {
  padding: "11px 18px",
  borderRadius: 999,
  border: "1px solid var(--line, #e7ecf2)",
  background: "#fff",
  color: "#334155",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

const tabBtnActive: React.CSSProperties = {
  background: "var(--primary, #1e40af)",
  color: "#fff",
  border: "1px solid var(--primary, #1e40af)",
  boxShadow: "0 2px 8px rgba(30, 64, 175, 0.25)",
};

const card: React.CSSProperties = {
  border: "1px solid var(--line, #e7ecf2)",
  borderRadius: 18,
  padding: "22px 22px 24px",
  background: "#fff",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 28px rgba(15, 23, 42, 0.06)",
};

const sectionHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
  alignItems: "flex-start",
  paddingBottom: 4,
  borderBottom: "1px solid var(--line, #e7ecf2)",
  marginBottom: 4,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  margin: 0,
  letterSpacing: "-0.02em",
  color: "#0f172a",
};

const mutedSmall: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  marginTop: 6,
  lineHeight: 1.55,
};

const notice: React.CSSProperties = {
  marginTop: 18,
  border: "1px solid var(--line, #e7ecf2)",
  background: "linear-gradient(180deg, #fafbfc 0%, #f4f7fb 100%)",
  borderRadius: 14,
  padding: "16px 18px",
  color: "#0f172a",
  borderLeft: "4px solid var(--primary, #1e40af)",
  textAlign: "left",
};

const noticeTitle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 14,
  marginBottom: 10,
  color: "#0f172a",
};

const noticeBody: React.CSSProperties = {
  color: "#334155",
  fontSize: 14,
  lineHeight: 1.65,
  textAlign: "left",
  wordSpacing: "normal",
};

const referralNoticeMain: React.CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 14,
  lineHeight: 1.65,
  textAlign: "left",
  wordSpacing: "normal",
  hyphens: "manual",
};

const referralNoticeSub: React.CSSProperties = {
  margin: 0,
  marginTop: 8,
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.55,
  textAlign: "left",
  wordSpacing: "normal",
  hyphens: "manual",
};

const noticeList: React.CSSProperties = {
  margin: 0,
  paddingLeft: 20,
  display: "grid",
  gap: 8,
  color: "#334155",
  fontSize: 14,
  lineHeight: 1.55,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
  marginTop: 18,
};

const tile: React.CSSProperties = {
  border: "1px solid var(--line, #e7ecf2)",
  borderRadius: 14,
  padding: "16px 16px 14px",
  background: "#fff",
  minHeight: 128,
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
};

const tileHighlightEval: React.CSSProperties = {
  borderLeft: "4px solid #22c55e",
  paddingLeft: 12,
};

const tileHighlightRef: React.CSSProperties = {
  borderLeft: "4px solid #93c5fd",
  paddingLeft: 12,
};

const tileTitle: React.CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const tileValue: React.CSSProperties = {
  marginTop: 10,
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: "#0f172a",
  flex: 1,
};

const tileMeta: React.CSSProperties = {
  marginTop: "auto",
  paddingTop: 10,
  fontSize: 12,
  color: "#64748b",
  lineHeight: 1.5,
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 900,
  color: "#64748b",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: 0.2,
};

const mono: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 12,
};

const inputStyle: React.CSSProperties = {
  flex: "1 1 240px",
  minWidth: 0,
  padding: "11px 14px",
  borderRadius: 12,
  border: "1px solid var(--line, #e7ecf2)",
  background: "#fff",
  fontSize: 14,
  color: "#0f172a",
};
