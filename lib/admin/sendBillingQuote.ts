import { prisma } from "@/lib/db";
import type { CollectedBillingImage } from "@/lib/admin/billingAttachments";
import {
  deleteStagingForClientEmail,
  isStagingCompleteForSendFromProcessors,
  loadStagingCompensationSlots,
  loadStagingImagesForSend,
} from "@/lib/admin/paymentQuoteStaging";
import { recordProcessorQuoteImageUpload } from "@/lib/processorCompensationLedger";
import { createPaymentQuoteAdmin } from "@/lib/admin/paymentQuoteCreate";
import { computeQuotedPaymentTotals } from "@/lib/quotedPaymentTotals";
import { buildBillingQuoteEmail } from "@/lib/email/billingQuoteEmail";
import { isMailEnvConfigured, sendMail } from "@/lib/email/mailer";
import { findUserWith1701aSubmissionByEmail } from "@/lib/admin/findUserWith1701aSubmission";
import { getAutoBillingBaseAmountForUser } from "@/lib/admin/billingAutoFee";
import { clientPaymentNoticePath } from "@/lib/clientPaymentFlow";
import { smtpSendContext } from "@/lib/smtpSendContext";
import { markQuoteRecipientEmailSent } from "@/lib/admin/quoteSentRecipients";
import {
  listProcessorUsers,
  processorLegacyLedgerActorKey,
  type ProcessorUser,
} from "@/lib/processorUsers";

/**
 * Ledger rows use `processorRole` exactly as stored. The income tracker filters by the signed-in
 * actor (`processor1` or `processor1:<employeeId>`). Staging may lack `uploadedByActorKey` for older
 * uploads; if there is exactly one Processor1/2 employee account, attribute bare uploads to them so
 * credits match their dashboard.
 *
 * Returns `null` when there are multiple JSON employees but no per-upload actor key — do not write
 * bare `processor1`/`processor2` rows (they would not match any employee session).
 */
function resolveQuoteImageLedgerActorKey(
  workspace: "processor1" | "processor2",
  stagingActorKey: string | null,
  roleUsers: ProcessorUser[],
): string | null {
  const fromStaging = stagingActorKey?.trim();
  if (fromStaging) return fromStaging;
  if (roleUsers.length === 1) return `${workspace}:${roleUsers[0].id}`;
  // No JSON employees: logins use `p1u:processor1_legacy` → actorKey `processor1:processor1_legacy`, not bare `processor1`.
  if (roleUsers.length === 0) return processorLegacyLedgerActorKey(workspace);
  // Multiple JSON employees but no per-slot actor key — cannot attribute without double-counting.
  return null;
}

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

function buildProviderSafeFallbackEmail(opts: {
  clientName: string;
  payUrl: string;
  finalAmountPhp: number;
  supportEmail: string;
}) {
  const amount = `PHP ${opts.finalAmountPhp.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const subject = "Payment link for your tax filing service";
  const textBody = [
    `Hello ${opts.clientName},`,
    "",
    "Your billing quote is ready.",
    `Amount due: ${amount}`,
    `Payment link: ${opts.payUrl}`,
    "",
    `If you need help, reply to this email or contact ${opts.supportEmail}.`,
    "",
    "FileRight Solutions",
  ].join("\n");
  const htmlBody = [
    `<p>Hello ${opts.clientName.replace(/</g, "&lt;").replace(/>/g, "&gt;")},</p>`,
    "<p>Your billing quote is ready.</p>",
    `<p><strong>Amount due:</strong> ${amount}</p>`,
    `<p><a href="${opts.payUrl}">Open payment link</a><br/><span style="word-break:break-all">${opts.payUrl}</span></p>`,
    `<p>If you need help, reply to this email or contact <a href="mailto:${opts.supportEmail}">${opts.supportEmail}</a>.</p>`,
    "<p>FileRight Solutions</p>",
  ].join("");
  return { subject, textBody, htmlBody };
}

function sanitizeAttachmentFilename(name: string, fallback: string): string {
  const cleaned = String(name || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ");
  return cleaned || fallback;
}

export type SendBillingQuoteResult = {
  ok: boolean;
  code: "ok" | "user_not_found" | "evaluation_not_submitted" | "attachments_incomplete";
  token?: string;
  emailSent: boolean;
  emailError: boolean;
  emailDevLog: boolean;
  emailFailureReason: string;
  usedFallbackSend: boolean;
};

export async function sendBillingQuoteToUserEmail(params: {
  userEmail: string;
  clientNote?: string | null;
  serviceFeeOverridePhp?: number | null;
}): Promise<SendBillingQuoteResult> {
  const email = params.userEmail.trim().toLowerCase();
  const user = await findUserWith1701aSubmissionByEmail(email);
  if (!user) {
    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    return {
      ok: false,
      code: exists ? "evaluation_not_submitted" : "user_not_found",
      emailSent: false,
      emailError: false,
      emailDevLog: false,
      emailFailureReason: "",
      usedFallbackSend: false,
    };
  }

  if (!(await isStagingCompleteForSendFromProcessors(email))) {
    return {
      ok: false,
      code: "attachments_incomplete",
      emailSent: false,
      emailError: false,
      emailDevLog: false,
      emailFailureReason: "",
      usedFallbackSend: false,
    };
  }

  let uploadedImages: CollectedBillingImage[] = [];
  let stagingSubmissionId: string | null = null;
  let stagingRowIds: string[] = [];
  try {
    const staging = await loadStagingImagesForSend(email);
    uploadedImages = staging.images;
    stagingSubmissionId = staging.submissionId;
    stagingRowIds = staging.stagingRowIds;
  } catch {
    return {
      ok: false,
      code: "attachments_incomplete",
      emailSent: false,
      emailError: false,
      emailDevLog: false,
      emailFailureReason: "",
      usedFallbackSend: false,
    };
  }
  // Ensure deterministic, unique outbound filenames for quote images across providers/clients.
  // Some clients/providers may collapse duplicate names and appear to "drop" attachments.
  uploadedImages = uploadedImages.map((img, i) => {
    const slot = i + 1;
    const fallbackName = `quote-image-${slot}`;
    const base = sanitizeAttachmentFilename(img.filename, fallbackName);
    const hasSlotPrefix = /^quote-image-\d+\s*-\s*/i.test(base);
    const filename = hasSlotPrefix ? base : `quote-image-${slot} - ${base}`;
    return { ...img, filename };
  });

  const autoBaseAmountPhp = await getAutoBillingBaseAmountForUser(user.id);
  const overrideFee = params.serviceFeeOverridePhp;
  const baseAmountPhp =
    typeof overrideFee === "number" && Number.isInteger(overrideFee) && overrideFee >= 1
      ? overrideFee
      : autoBaseAmountPhp;
  const { token } = await createPaymentQuoteAdmin({
    userId: user.id,
    baseAmountPhp,
    clientNote: params.clientNote?.trim() || null,
    adminMemo: null,
    expiresAt: null,
  });

  const confirmedCredits = await prisma.referralEvent.count({
    where: { referrerId: user.id, evaluationCompleted: true },
  });
  const totals = computeQuotedPaymentTotals(baseAmountPhp, confirmedCredits);
  const mailCtx = smtpSendContext();
  const payUrl = `${mailCtx.siteBaseUrl}${clientPaymentNoticePath(token)}`;
  const builtEmail = await buildBillingQuoteEmail({
    clientFullName: user.fullName.trim() || "Client",
    baseAmountPhp: totals.baseAmountPhp,
    discountPhp: totals.discountPhp,
    finalAmountPhp: totals.finalAmountPhp,
    confirmedCreditCount: confirmedCredits,
    percentPerCredit: mailCtx.referralFeeReductionPercent,
    payUrl,
    clientNote: params.clientNote?.trim() || null,
    expiresAt: null,
  });
  const subject = builtEmail.subject;
  const textBody = builtEmail.textBody;
  const htmlBody = builtEmail.htmlBody;
  const templateAttachments = Array.isArray(builtEmail.attachments) ? builtEmail.attachments : [];
  const emailAttachments = [...uploadedImages, ...templateAttachments];

  let emailSent = false;
  let emailError = false;
  let emailDevLog = false;
  let emailFailureReason = "";
  let usedFallbackSend = false;

  try {
    console.info("BILLING_QUOTE_SEND_ATTACHMENTS", {
      to: user.email,
      count: emailAttachments.length,
      filenames: emailAttachments.map((a) => a.filename),
    });
    const result = await sendMail(user.email, subject, textBody, htmlBody, {
      attachments: emailAttachments,
      ...(mailCtx.smtpBcc ? { bcc: mailCtx.smtpBcc } : {}),
      ...(!mailCtx.smtpFromEnv ? { fromOverride: mailCtx.fromOverrideWhenNoSmtpFrom } : {}),
    });
    if (result.messageId === "DEV_LOG_ONLY") {
      emailDevLog = true;
    } else {
      emailSent = true;
    }
  } catch (e) {
    const msg = mailFailureDigest(e);
    emailError = true;
    if (!isMailEnvConfigured()) {
      emailFailureReason = "missing_mail_env";
    } else if (/552|checkspam|spam or virus|virus content|rejected for spam/i.test(msg)) {
      emailFailureReason = "provider_content_filter";
      try {
        const fallback = buildProviderSafeFallbackEmail({
          clientName: user.fullName.trim() || "Client",
          payUrl,
          finalAmountPhp: totals.finalAmountPhp,
          supportEmail: mailCtx.supportEmail,
        });
        const retry = await sendMail(user.email, fallback.subject, fallback.textBody, fallback.htmlBody, {
          ...(mailCtx.smtpBcc ? { bcc: mailCtx.smtpBcc } : {}),
          ...(!mailCtx.smtpFromEnv ? { fromOverride: mailCtx.fromOverrideWhenNoSmtpFrom } : {}),
        });
        if (retry.messageId === "DEV_LOG_ONLY") {
          emailDevLog = true;
        } else {
          emailSent = true;
          emailError = false;
          emailFailureReason = "";
          usedFallbackSend = true;
        }
      } catch {
        // keep original failure status
      }
    } else {
      emailFailureReason = "mail_send_failed";
    }
  }

  // Remove client from quote dropdown only after verified successful delivery.
  if (emailSent && !emailError) {
    try {
      await prisma.adminAudit.create({
        data: {
          action: "QUOTE_EMAIL_SENT_SNAPSHOT",
          details: JSON.stringify({
            userId: user.id,
            clientEmail: email,
            submissionId: stagingSubmissionId,
            stagingRowIds,
            usedFallbackSend,
          }),
        },
      });
    } catch (auditErr) {
      console.error("QUOTE_SEND_SNAPSHOT_AUDIT_FAILED", auditErr);
    }

    // Compensate processors only when the client actually received the email with quote images
    // (not the text-only spam-filter fallback).
    if (!usedFallbackSend) {
      try {
        const [p1Users, p2Users, compSlots] = await Promise.all([
          listProcessorUsers("processor1"),
          listProcessorUsers("processor2"),
          loadStagingCompensationSlots(email),
        ]);
        for (const row of compSlots) {
          if (row.uploadedBy !== "processor1" && row.uploadedBy !== "processor2") continue;
          const roleUsers = row.uploadedBy === "processor1" ? p1Users : p2Users;
          const processorActorKey = resolveQuoteImageLedgerActorKey(
            row.uploadedBy,
            row.uploadedByActorKey,
            roleUsers,
          );
          if (!processorActorKey) {
            console.warn("QUOTE_IMAGE_COMPENSATION_SKIP_AMBIGUOUS", {
              slot: row.slot,
              workspace: row.uploadedBy,
              employeeCount: roleUsers.length,
            });
            continue;
          }
          try {
            await recordProcessorQuoteImageUpload({
              processorActorKey,
              clientEmail: email,
              slot: row.slot,
            });
          } catch (ledgerErr) {
            console.error("PROCESSOR_COMPENSATION_LEDGER_QUOTE_IMAGE_SEND", ledgerErr);
          }
        }
      } catch (compErr) {
        console.error("QUOTE_SEND_COMPENSATION_SLOTS", compErr);
      }
    }
    await deleteStagingForClientEmail(email).catch(() => {});
    await markQuoteRecipientEmailSent(email).catch(() => {});
  }

  return {
    ok: true,
    code: "ok",
    token,
    emailSent,
    emailError,
    emailDevLog,
    emailFailureReason,
    usedFallbackSend,
  };
}
