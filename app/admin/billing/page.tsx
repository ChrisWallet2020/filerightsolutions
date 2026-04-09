import { redirect } from "next/navigation";
import { config } from "@/lib/config";
import { isAdminAuthed } from "@/lib/auth";

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!isAdminAuthed()) {
    redirect("/admin/login");
  }

  const previewError = typeof searchParams.previewError === "string" ? searchParams.previewError.trim() : "";
  const emailed = searchParams.emailed === "1";
  const emailFailed = searchParams.emailError === "1";
  const emailDev = searchParams.emailDev === "1";
  const baseUrl = String(config.baseUrl).replace(/\/$/, "");

  const previewErrorMessage =
    previewError === "user_not_found"
      ? "Preview failed: no registered account matches the client email."
      : previewError === "invalid_form"
        ? "Preview failed: please check required fields and try again."
        : previewError === "attachment_type"
          ? "Preview failed: billing attachment must be an image file."
          : previewError === "attachment_size"
            ? "Preview failed: billing attachment is too large (max 10MB)."
            : "";

  return (
    <section className="section">
      <h1>Billing &amp; quotes</h1>
      <p className="muted">
        Enter the client&apos;s registered email and total service fee. <b>Send billing email</b> creates the quote and
        sends the payment email using your provided values and optional attachment.
      </p>

      {emailFailed ? (
        <div
          className="notice"
          style={{ marginTop: 14, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}
        >
          <strong>Email failed to send</strong>
          <p style={{ margin: "8px 0 0" }}>
            The quote was still created. Configure SMTP (see <code>.env.example</code>) or send the link manually
            below.
          </p>
        </div>
      ) : null}

      {emailDev ? (
        <div
          className="notice"
          style={{ marginTop: 14, borderColor: "#fde68a", background: "#fffbeb", color: "#92400e" }}
        >
          <strong>Development: email not delivered</strong>
          <p style={{ margin: "8px 0 0" }}>
            SMTP is not configured, so the message was only logged on the server (see terminal). The quote was still
            created—copy the payment link below or set <code>SMTP_*</code> in <code>.env</code> to send real mail.
          </p>
        </div>
      ) : null}

      {emailed && !emailFailed && !emailDev ? (
        <div className="notice" style={{ marginTop: 14, borderColor: "#bbf7d0", background: "#f0fdf4" }}>
          <strong>Billing email sent</strong>
          <p style={{ margin: "8px 0 0" }}>Message sent to the client with amounts and the payment link.</p>
        </div>
      ) : null}

      {previewErrorMessage ? (
        <div
          className="notice"
          style={{ marginTop: 14, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}
        >
          <strong>Billing preview failed</strong>
          <p style={{ margin: "8px 0 0" }}>{previewErrorMessage}</p>
        </div>
      ) : null}

      <div className="checkoutGrid" style={{ marginTop: 22, gridTemplateColumns: "1fr", maxWidth: 760 }}>
        <div className="checkoutBox">
          <h2>Create quote</h2>
          <form method="post" action="/api/admin/payment-quotes" className="form" encType="multipart/form-data">
            <label>
              Client email (must match registered account)
              <input name="userEmail" type="email" required placeholder="client@example.com" />
            </label>
            <label>
              Service Fee (PHP)
              <input name="baseAmountPhp" type="number" min={1} step={1} required placeholder="3500" />
            </label>
            <label>
              Note to client (optional, shown on payment page)
              <textarea
                name="clientNote"
                rows={3}
                placeholder="e.g. 1701A amendment — as discussed"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 12 }}
              />
            </label>
            <label>
              Internal memo (optional, not shown to client)
              <textarea
                name="adminMemo"
                rows={2}
                placeholder="For your records only"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 12 }}
              />
            </label>
            <label>
              Expires in days (optional)
              <input name="expiresInDays" type="number" min={1} max={365} placeholder="Leave blank for no expiry" />
            </label>
            <label>
              Billing attachment image
              <input name="billingAttachment" type="file" accept="image/*" />
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button type="submit" className="btn btnSecondary" formAction="/api/admin/payment-quotes/preview">
                Preview billing email
              </button>
              <button type="submit" className="btn" formAction="/api/admin/payment-quotes/send">
                Send billing email
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
