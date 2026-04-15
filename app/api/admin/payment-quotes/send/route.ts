import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import {
  collectBillingImagesFromFormData,
  type CollectedBillingImage,
} from "@/lib/admin/billingAttachments";
import { createPaymentQuoteAdmin } from "@/lib/admin/paymentQuoteCreate";
import { computeQuotedPaymentTotals } from "@/lib/quotedPaymentTotals";
import { buildBillingQuoteEmail } from "@/lib/email/billingQuoteEmail";
import { isMailEnvConfigured, sendMail } from "@/lib/email/mailer";
import { findUserWith1701aSubmissionByEmail } from "@/lib/admin/findUserWith1701aSubmission";
import { smtpSendContext } from "@/lib/smtpSendContext";

/** Mail transport errors often put provider reply text on `response`, not only `message`. */
function mailFailureDigest(err: unknown): string {
  const parts: string[] = [];
  if (err instanceof Error) {
    parts.push(err.message);
    const o = err as unknown as Record<string, unknown>;
    if (typeof o.response === "string") parts.push(o.response);
    if (o.responseCode != null) parts.push(String(o.responseCode));
    if (typeof o.command === "string") parts.push(o.command);
  } else {
    parts.push(String(err));
  }
  return parts.join(" ");
}

const Schema = z.object({
  userEmail: z.string().email(),
  baseAmountPhp: z.coerce.number().int().positive().max(50_000_000),
  clientNote: z.string().max(2000).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") || "";
  let raw: Record<string, unknown>;
  let uploadedImages: CollectedBillingImage[] = [];
  if (ct.includes("application/json")) {
    raw = await req.json().catch(() => ({}));
  } else {
    const form = await req.formData();
    raw = Object.fromEntries(form.entries());
    const imgResult = await collectBillingImagesFromFormData(form);
    if (imgResult.ok === false) {
      const err =
        imgResult.error === "attachment_type" ? "attachment_must_be_image" : "attachment_too_large_max_10mb";
      return NextResponse.json({ error: err }, { status: 400 });
    }
    uploadedImages = imgResult.images;
  }

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 400 });
  }

  const { userEmail, baseAmountPhp, clientNote } = parsed.data;
  const email = userEmail.trim().toLowerCase();

  const user = await findUserWith1701aSubmissionByEmail(email);
  if (!user) {
    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    const err = exists ? "evaluation_not_submitted" : "user_not_found";
    const redir = new URL("/admin/billing", req.url);
    redir.searchParams.set("quoteError", err);
    return NextResponse.redirect(redir, 303);
  }

  const { token } = await createPaymentQuoteAdmin({
    userId: user.id,
    baseAmountPhp,
    clientNote: clientNote?.trim() || null,
    adminMemo: null,
    expiresAt: null,
  });

  const confirmedCredits = await prisma.referralEvent.count({
    where: { referrerId: user.id, evaluationCompleted: true },
  });

  const totals = computeQuotedPaymentTotals(baseAmountPhp, confirmedCredits);
  const mailCtx = smtpSendContext();
  const payUrl = `${mailCtx.siteBaseUrl}/account/payment?q=${encodeURIComponent(token)}`;

  const { subject, textBody, htmlBody, attachments } = buildBillingQuoteEmail({
    clientFullName: user.fullName.trim() || "Client",
    baseAmountPhp: totals.baseAmountPhp,
    discountPhp: totals.discountPhp,
    finalAmountPhp: totals.finalAmountPhp,
    confirmedCreditCount: confirmedCredits,
    percentPerCredit: mailCtx.referralFeeReductionPercent,
    payUrl,
    clientNote: clientNote?.trim() || null,
    expiresAt: null,
  });
  const emailAttachments = [...uploadedImages, ...attachments];

  let emailSent = false;
  let emailError = false;
  let emailDevLog = false;
  let emailFailureReason = "";
  try {
    const result = await sendMail(user.email, subject, textBody, htmlBody, {
      replyTo: mailCtx.supportEmail,
      attachments: emailAttachments,
      ...(mailCtx.smtpBcc ? { bcc: mailCtx.smtpBcc } : {}),
      ...(!mailCtx.smtpFromEnv ? { fromOverride: mailCtx.fromOverrideWhenNoSmtpFrom } : {}),
    });
    if (result.messageId === "DEV_LOG_ONLY") {
      emailDevLog = true;
    } else {
      emailSent = true;
      console.info("BILLING_QUOTE_EMAIL_OK", {
        to: user.email,
        messageId: result.messageId,
        bcc: Boolean(mailCtx.smtpBcc),
      });
    }
  } catch (e) {
    const msg = mailFailureDigest(e);
    console.error("BILLING_QUOTE_EMAIL_FAILED:", msg);
    emailError = true;
    if (!isMailEnvConfigured()) {
      emailFailureReason = "missing_mail_env";
    } else if (/552|checkspam|spam or virus|virus content|rejected for spam/i.test(msg)) {
      // GoDaddy / secureserver outbound content filter (often images or wording).
      emailFailureReason = "provider_content_filter";
    } else {
      emailFailureReason = "mail_send_failed";
    }
  }

  const redir = new URL("/admin/billing", req.url);
  redir.searchParams.set("newToken", token);
  redir.searchParams.set("emailed", emailSent ? "1" : "0");
  if (emailDevLog) {
    redir.searchParams.set("emailDev", "1");
  }
  if (emailError) {
    redir.searchParams.set("emailError", "1");
    if (emailFailureReason) {
      redir.searchParams.set("emailReason", emailFailureReason);
    }
  }
  return NextResponse.redirect(redir, 303);
}
