import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { getSubmitted1701aClientOptions } from "@/lib/admin/submittedClientOptions";
import { BillingQuoteForm } from "./BillingQuoteForm";

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!isAdminAuthed()) {
    redirect("/admin/login");
  }

  const submittedClients = await getSubmitted1701aClientOptions();

  const previewError = typeof searchParams.previewError === "string" ? searchParams.previewError.trim() : "";
  const quoteError = typeof searchParams.quoteError === "string" ? searchParams.quoteError.trim() : "";
  const emailed = searchParams.emailed === "1";
  const emailFailed = searchParams.emailError === "1";
  const emailDev = searchParams.emailDev === "1";
  const emailReason =
    typeof searchParams.emailReason === "string" ? searchParams.emailReason.trim() : "";

  const previewErrorMessage =
    previewError === "user_not_found"
      ? "Preview failed: no registered account matches the client email."
      : previewError === "evaluation_not_submitted"
        ? "Preview failed: billing is limited to clients who have already submitted their 1701A evaluation."
        : previewError === "invalid_form"
          ? "Preview failed: please check required fields and try again."
          : previewError === "attachment_type"
            ? "Preview failed: billing images must be image files."
            : previewError === "attachment_size"
              ? "Preview failed: each image must be 10MB or smaller."
              : "";

  const quoteErrorMessage =
    quoteError === "evaluation_not_submitted"
      ? "Quote was not created: that account has not submitted a 1701A evaluation yet."
      : quoteError === "user_not_found"
        ? "Quote was not created: no registered account matches that email."
        : "";

  return (
    <section className="section">
      <h1>Billing &amp; quotes</h1>
      <p className="muted">
        Search by client <b>full name</b> (they must have already <b>submitted</b> their 1701A evaluation). The billing
        email is sent to their sign-in email. Enter the service fee.{" "}
        <b>Send billing email</b> creates the quote and sends the payment email. You can attach up to three images if
        needed.
      </p>

      {emailFailed ? (
        <div
          className="notice"
          style={{ marginTop: 14, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}
        >
          <strong>Email failed to send</strong>
          {emailReason === "provider_content_filter" ? (
            <p style={{ margin: "8px 0 0" }}>
              The quote was still created. Your mail host (e.g. GoDaddy) accepted the login but{" "}
              <strong>blocked the message as spam or suspicious content</strong> (SMTP 552 / content filter)—this is
              not a Vercel bug. Try again <strong>without billing images</strong>, use a shorter client note, or paste
              the payment link manually. If it persists, open{" "}
              <a href="https://checkspam.secureserver.net/" style={{ color: "#1d4ed8" }}>
                https://checkspam.secureserver.net/
              </a>{" "}
              with the error from{" "}
              <a href="https://vercel.com/filerightsolutions/tax-service-site/logs" style={{ color: "#1d4ed8" }}>
                Vercel logs
              </a>{" "}
              (<code>BILLING_QUOTE_EMAIL_FAILED</code>).
            </p>
          ) : emailReason === "smtp_send_failed" ? (
            <p style={{ margin: "8px 0 0" }}>
              The quote was still created. SMTP is configured, but the provider rejected this message. Check{" "}
              <a href="https://vercel.com/filerightsolutions/tax-service-site/logs" style={{ color: "#1d4ed8" }}>
                Vercel logs
              </a>{" "}
              for <code>BILLING_QUOTE_EMAIL_FAILED</code>. Common causes: wrong app password, or <code>SMTP_FROM</code>{" "}
              not allowed for your <code>SMTP_USER</code>. You can send the payment link manually below.
            </p>
          ) : emailReason === "missing_smtp_env" ? (
            <p style={{ margin: "8px 0 0" }}>
              The quote was still created. Set <code>SMTP_HOST</code>, <code>SMTP_USER</code>, and{" "}
              <code>SMTP_PASS</code> for <strong>Production</strong> in Vercel, redeploy, then retry. See{" "}
              <code>.env.example</code>. Copy the link below meanwhile.
            </p>
          ) : (
            <p style={{ margin: "8px 0 0" }}>
              The quote was still created. Configure SMTP (see <code>.env.example</code>) or send the link manually
              below.
            </p>
          )}
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
        <div
          className="notice"
          style={{
            marginTop: 14,
            width: "100%",
            maxWidth: 760,
            borderColor: "#86efac",
            background: "#f0fdf4",
            padding: "8px 12px",
            color: "#14532d",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.01em" }}>Billing email sent</div>
          <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.5, color: "#166534" }}>
            Delivery is usually immediate. If the client doesn&apos;t see it, suggest spam or promotions.
          </p>
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

      {quoteErrorMessage ? (
        <div
          className="notice"
          style={{ marginTop: 14, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}
        >
          <strong>Unable to create quote</strong>
          <p style={{ margin: "8px 0 0" }}>{quoteErrorMessage}</p>
        </div>
      ) : null}

      <BillingQuoteForm submittedClients={submittedClients} />
    </section>
  );
}
