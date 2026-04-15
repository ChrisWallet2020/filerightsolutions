"use client";

export function AgentLogoutButton() {
  return (
    <button
      type="button"
      className="linkBtn"
      style={{ color: "#bfdbfe", padding: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
      onClick={async () => {
        await fetch("/api/agent/logout", { method: "POST", credentials: "same-origin" });
        window.location.href = "/agent/login";
      }}
    >
      Sign out
    </button>
  );
}
