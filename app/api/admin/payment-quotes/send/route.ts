import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { config } from "@/lib/config";
import { createPaymentQuoteAdmin } from "@/lib/admin/paymentQuoteCreate";
import { computeQuotedPaymentTotals } from "@/lib/quotedPaymentTotals";
import { buildBillingQuoteEmail } from "@/lib/email/billingQuoteEmail";
import { sendMail } from "@/lib/email/mailer";

const Schema = z.object({
  userEmail: z.string().email(),
  baseAmountPhp: z.coerce.number().int().positive().max(50_000_000),
  clientNote: z.string().max(2000).optional().or(z.literal("")),
  adminMemo: z.string().max(2000).optional().or(z.literal("")),
  expiresInDays: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return undefined;
      const n = typeof v === "number" ? v : Number(String(v).trim());
      if (!Number.isFinite(n) || n < 1 || n > 365) return undefined;
      return Math.floor(n);
    }),
});

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") || "";
  let raw: Record<string, unknown>;
  let uploadedAttachment:
    | {
        filename: string;
        content: Buffer;
        contentType: string;
      }
    | null = null;
  if (ct.includes("application/json")) {
    raw = await req.json().catch(() => ({}));
  } else {
    const form = await req.formData();
    raw = Object.fromEntries(form.entries());
    const file = form.get("billingAttachment");
    if (file instanceof File && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "attachment_must_be_image" }, { status: 400 });
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "attachment_too_large_max_10mb" }, { status: 400 });
      }
      uploadedAttachment = {
        filename: file.name || "billing-attachment",
        content: Buffer.from(await file.arrayBuffer()),
        contentType: file.type || "application/octet-stream",
      };
    }
  }

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 400 });
  }

  const { userEmail, baseAmountPhp, clientNote, adminMemo, expiresInDays } = parsed.data;
  const email = userEmail.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const expiresAt =
    expiresInDays != null ? new Date(Date.now() + expiresInDays * 86400000) : null;

  const { token } = await createPaymentQuoteAdmin({
    userId: user.id,
    baseAmountPhp,
    clientNote: clientNote?.trim() || null,
    adminMemo: adminMemo?.trim() || null,
    expiresAt,
  });

  const confirmedCredits = await prisma.referralEvent.count({
    where: { referrerId: user.id, evaluationCompleted: true },
  });

  const totals = computeQuotedPaymentTotals(baseAmountPhp, confirmedCredits);
  const baseUrl = String(config.baseUrl).replace(/\/$/, "");
  const payUrl = `${baseUrl}/account/payment?q=${encodeURIComponent(token)}`;

  const { subject, textBody, htmlBody, attachments } = buildBillingQuoteEmail({
    clientFullName: user.fullName.trim() || "Client",
    baseAmountPhp: totals.baseAmountPhp,
    discountPhp: totals.discountPhp,
    finalAmountPhp: totals.finalAmountPhp,
    confirmedCreditCount: confirmedCredits,
    percentPerCredit: config.referralFeeReductionPercent,
    payUrl,
    clientNote: clientNote?.trim() || null,
    expiresAt,
  });
  const emailAttachments = uploadedAttachment ? [uploadedAttachment] : attachments;

  let emailSent = false;
  let emailError = false;
  let emailDevLog = false;
  try {
    // Reply-To: support inbox. From: SMTP_FROM when set (provider alignment), else "Site <SUPPORT_EMAIL>".
    const result = await sendMail(user.email, subject, textBody, htmlBody, {
      replyTo: config.supportEmail,
      attachments: emailAttachments,
      ...(config.smtp.bcc ? { bcc: config.smtp.bcc } : {}),
      ...(!config.smtp.from?.trim()
        ? { fromOverride: `${config.siteName} <${config.supportEmail}>` }
        : {}),
    });
    if (result.messageId === "DEV_LOG_ONLY") {
      emailDevLog = true;
    } else {
      emailSent = true;
      console.info("BILLING_QUOTE_EMAIL_OK", {
        to: user.email,
        messageId: result.messageId,
        bcc: Boolean(config.smtp.bcc),
      });
    }
  } catch (e) {
    console.error("BILLING_QUOTE_EMAIL_FAILED:", e);
    emailError = true;
  }

  const redir = new URL("/admin/billing", req.url);
  redir.searchParams.set("newToken", token);
  redir.searchParams.set("emailed", emailSent ? "1" : "0");
  if (emailDevLog) {
    redir.searchParams.set("emailDev", "1");
  }
  if (emailError) {
    redir.searchParams.set("emailError", "1");
  }
  return NextResponse.redirect(redir, 303);
}
