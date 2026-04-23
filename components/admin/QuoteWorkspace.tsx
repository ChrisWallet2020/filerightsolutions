import { getSubmitted1701aClientOptions } from "@/lib/admin/submittedClientOptions";
import { BillingQuoteForm } from "@/components/admin/BillingQuoteForm";
import type { QuoteUploaderRole } from "@/lib/admin/paymentQuoteStaging";

export async function QuoteWorkspace({
  searchParams,
  quoteUploaderRole,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  /** Which dashboard this page is (slots 1–2 vs 3–4), independent of admin cookie. */
  quoteUploaderRole: QuoteUploaderRole;
}) {
  const submittedClients = await getSubmitted1701aClientOptions();

  const previewError = typeof searchParams.previewError === "string" ? searchParams.previewError.trim() : "";
  const quoteError = typeof searchParams.quoteError === "string" ? searchParams.quoteError.trim() : "";
  const emailed = searchParams.emailed === "1";
  const emailFailed = searchParams.emailError === "1";
  const emailDev = searchParams.emailDev === "1";
  const emailFallback = searchParams.emailFallback === "1";
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
              : previewError === "attachments_incomplete"
                ? "Preview failed: all four quote images must be uploaded before preview."
                : previewError === "preview_side_incomplete"
                  ? "Preview failed: upload the required quote images for this workspace first."
                  : "";

  const quoteErrorMessage =
    quoteError === "evaluation_not_submitted"
      ? "Quote was not created: that account has not submitted a 1701A evaluation yet."
      : quoteError === "user_not_found"
        ? "Quote was not created: no registered account matches that email."
        : quoteError === "attachments_incomplete"
          ? "Quote was not created: slots 1-2 must be uploaded by Processor1 and slots 3-4 by Processor2."
          : "";

  const isProcessorWorkspace = quoteUploaderRole === "processor1" || quoteUploaderRole === "processor2";

  return (
    <section className="section">
      <h1>Quote</h1>
      {isProcessorWorkspace ? (
        <p className="muted adminPageIntro">
          Search by client full name, add your images, then click Save. Admins preview and send from the Admin Quote
          tab.
        </p>
      ) : (
        <p className="muted adminPageIntro">
          Search by client full name. The quote email is sent to their sign-in email. Service fee is auto-computed from
          the submitted form. Send quote email creates the quote and sends the payment email. You can attach four images
          if needed.
        </p>
      )}

      {emailFailed ? (
        <div className="adminNotice adminNotice--error" style={{ marginTop: 14, width: "100%", maxWidth: 760 }}>
          <strong className="adminNoticeTitle">Email failed to send</strong>
          {emailReason === "provider_content_filter" ? (
            <p className="adminNoticeBody">
              The quote was still created. Your mail host (e.g. GoDaddy) accepted the login but{" "}
              <strong>blocked the message as spam or suspicious content</strong> (SMTP 552 / content filter)—this is
              not a Vercel bug. Try again <strong>without quote images</strong>, use a shorter client note, or paste
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
          ) : emailReason === "mail_send_failed" || emailReason === "smtp_send_failed" ? (
            <p className="adminNoticeBody">
              The quote was still created. Resend is configured, but the provider rejected this message. Check{" "}
              <a href="https://vercel.com/filerightsolutions/tax-service-site/logs" style={{ color: "#1d4ed8" }}>
                Vercel logs
              </a>{" "}
              for <code>BILLING_QUOTE_EMAIL_FAILED</code>. Common causes: invalid <code>RESEND_API_KEY</code>, unverified
              From domain, or content policy. You can send the payment link manually below.
            </p>
          ) : emailReason === "missing_mail_env" || emailReason === "missing_smtp_env" ? (
            <p className="adminNoticeBody">
              The quote was still created. Set <code>RESEND_API_KEY</code> (and a verified <code>SMTP_FROM</code> or{" "}
              <code>RESEND_FROM</code> in production) for <strong>Production</strong> in Vercel, redeploy, then retry.
              See <code>.env.example</code>. Copy the link below meanwhile.
            </p>
          ) : (
            <p className="adminNoticeBody">
              The quote was still created. Configure Resend (see <code>.env.example</code>) or send the link manually
              below.
            </p>
          )}
        </div>
      ) : null}

      {emailDev ? (
        <div className="adminNotice adminNotice--warn" style={{ marginTop: 14, width: "100%", maxWidth: 760 }}>
          <strong className="adminNoticeTitle">Email not sent (Resend not configured here)</strong>
          <p className="adminNoticeBody">
            This run did not have a usable <code>RESEND_API_KEY</code>, so nothing was sent to Resend—the payload was
            logged on the server only (see your terminal). The quote was still created; copy the payment link below. For
            real mail on your machine, add <code>RESEND_API_KEY</code> (and ideally <code>SMTP_FROM</code>) to{" "}
            <code>.env.local</code>, then restart <code>npm run dev</code>. On Vercel, add the same variables for Preview
            and/or Production, then redeploy.
          </p>
        </div>
      ) : null}

      {emailed && !emailFailed && !emailDev ? (
        <div
          className={emailFallback ? "adminNotice adminNotice--warn" : "adminNotice adminNotice--success"}
          style={{ marginTop: 14, width: "100%", maxWidth: 760 }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.01em" }}>
            {emailFallback ? "Quote email sent (simplified — no quote images)" : "Quote email sent"}
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.5 }}>
            {emailFallback
              ? "The mail provider accepted a plain, link-only version after blocking the full message. The client did not receive your four quote image attachments in that email."
              : "Delivery is usually immediate. If the client doesn&apos;t see it, suggest spam or promotions."}
          </p>
          {emailFallback ? (
            <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, fontWeight: 600 }}>
              Processor quote-image income was not credited for this send (income is only logged when the billing quote
              email is delivered with the images).
            </p>
          ) : null}
        </div>
      ) : null}

      {previewErrorMessage ? (
        <div className="adminNotice adminNotice--error" style={{ marginTop: 14, width: "100%", maxWidth: 760 }}>
          <strong className="adminNoticeTitle">Quote preview failed</strong>
          <p className="adminNoticeBody">{previewErrorMessage}</p>
        </div>
      ) : null}

      {quoteErrorMessage ? (
        <div className="adminNotice adminNotice--error" style={{ marginTop: 14, width: "100%", maxWidth: 760 }}>
          <strong className="adminNoticeTitle">Unable to create quote</strong>
          <p className="adminNoticeBody">{quoteErrorMessage}</p>
        </div>
      ) : null}

      <BillingQuoteForm submittedClients={submittedClients} quoteUploaderRole={quoteUploaderRole} />
    </section>
  );
}
