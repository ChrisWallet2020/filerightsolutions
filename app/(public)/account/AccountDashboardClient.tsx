"use client";

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
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: -0.2 }}>Account Dashboard</h1>
          <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.5 }}>
            <div>
              Signed in as <b style={{ color: "#0f172a" }}>{userFullName}</b>
            </div>
            <div style={{ fontSize: 13 }}>{userEmail}</div>
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
        <section style={{ ...card, marginTop: 14 }}>
          <div style={sectionHeader}>
            <h2 style={sectionTitle}>Overview</h2>
            <div style={mutedSmall}>
              This dashboard is your workspace. Nothing is filed automatically.
            </div>
          </div>

          <div style={notice}>
            <div style={noticeTitle}>How this works</div>
            <div style={noticeBody}>
              1) Fill out the evaluation form <b>exactly as previously filed</b>. <br />
              2) Click <b>Save</b> anytime while editing. <br />
              3) Submit only when you’re ready to proceed.
            </div>
          </div>

          <div style={grid2}>
            <div style={tile}>
              <div style={tileTitle}>1701A Evaluation</div>
              <div style={{ ...tileValue, color: statusColor }}>{status}</div>
              <div style={tileMeta}>
                Evaluation ID: <span style={mono}>{evaluationId}</span>
              </div>
            </div>

            <div style={tile}>
              <div style={tileTitle}>Referral</div>
              <div style={tileValue}>{credited}</div>
              <div style={tileMeta}>Confirmed credits from completed evaluations</div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "evaluation" && (
        <section style={{ ...card, marginTop: 14 }}>
          <div style={sectionHeader}>
            <h2 style={sectionTitle}>Free 1701A Evaluation</h2>
          </div>

          <div style={notice}>
            <div style={noticeTitle}>Before you begin</div>
            <div style={noticeBody}>
              Please enter details exactly as previously filed (same TIN, RDO, ATC, name, address, etc.). Use{" "}
              <b>Save</b> anytime while editing.
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
        <section style={{ ...card, marginTop: 14 }}>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>Referral Link</h2>
              <div style={mutedSmall}>Optional — share with another JO/COS professional.</div>
            </div>
          </div>

          <div style={notice}>
            <div style={noticeTitle}>How referral credit works</div>
            <div style={noticeBody}>
              Every person who uses your link and completes the free evaluation earns you one credit. On quoted bills,
              one credit reduces your service fee by 10%; maximum of one credit per client.
              <br />
              <span style={{ color: "#64748b" }}>
                The referred client does not need to purchase anything for you to earn the credit.
              </span>
              <br />
              <br />
              <span style={{ color: "#64748b" }}>
                Please note that if your billing email was already issued before the credit was added to your account,
                the reduction may not be reflected in that billing. Simply resubmit your evaluation to receive an updated
                billing.
              </span>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={label}>Your referral link</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input readOnly value={referralLink} style={inputStyle} />
              <button
                type="button"
                style={btnPrimary}
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

/* ---------- styles ---------- */

const page: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "48px 0",
};

const headerWrap: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const tabRow: React.CSSProperties = {
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
  fontWeight: 800,
  cursor: "pointer",
};

const tabBtnActive: React.CSSProperties = {
  background: "#0f172a",
  color: "white",
  border: "1px solid #0f172a",
};

const card: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
  background: "white",
};

const sectionHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  margin: 0,
};

const mutedSmall: React.CSSProperties = {
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
  color: "#0f172a",
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
  width: "min(720px, 100%)",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "white",
};

const btnPrimary: React.CSSProperties = {
  background: "#0f172a",
  color: "white",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 900,
  border: "1px solid #0f172a",
  cursor: "pointer",
};
