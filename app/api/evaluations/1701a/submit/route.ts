// app/api/evaluations/1701a/submit/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { getAuthedUserId } from "@/lib/auth";
import { generate1701aPdf } from "@/lib/pdf1701a";
import { sendMailWithAttachments } from "@/lib/email/mailer";
import { clientEmailBranding } from "@/lib/email/clientEmailBranding";
import { config } from "@/lib/config";
import { getSalesFeesLimits, isDeadlinePassedEnabled, isHighVolumeEnabled } from "@/lib/siteSettings";
import { renderClientEmailTemplate } from "@/lib/admin/clientEmailTemplates";
import {
  joinTextParagraphs,
  textToEmailHtmlParagraphs,
  wrapEmailMainHtml,
} from "@/lib/email/formatting";
import { unmarkQuoteRecipientEmailSent } from "@/lib/admin/quoteSentRecipients";

type AnyObj = Record<string, unknown>;

function parseAmountLikeInput(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const cleaned = v.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

function extractSalesValue(payload: AnyObj): number | null {
  const part4 = payload.part4 && typeof payload.part4 === "object" && !Array.isArray(payload.part4)
    ? (payload.part4 as Record<string, unknown>)
    : null;

  const from36A = parseAmountLikeInput(part4?.["36A"]);
  const from47A = parseAmountLikeInput(part4?.["47A"]);
  const fromGrossSales = parseAmountLikeInput(payload.grossSales);

  // Use whichever sales line has meaningful value; defaults like 0.00 should not
  // override a manually filled counterpart.
  const candidates = [from36A, from47A, fromGrossSales].filter(
    (v): v is number => v !== null && Number.isFinite(v)
  );
  if (!candidates.length) return null;
  return Math.max(...candidates);
}

function buildBelowMinimumMessage(minValue: number): string {
  const minPeso = `\u20b1${Math.round(minValue).toLocaleString("en-PH")}`;
  return joinTextParagraphs([
    `We regret to inform you that we are currently unable to process requests where total Sales / Revenues / Receipts / Fees are below ${minPeso}.`,
    "We appreciate your interest in our services, and we hope to assist you in the future should your circumstances change.",
  ]);
}

function nextDayAtNineAM(start: Date): Date {
  // Schedule at 9:00 AM Asia/Manila, regardless of server timezone.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(start);
  const y = Number(parts.find((p) => p.type === "year")?.value || "1970");
  const m = Number(parts.find((p) => p.type === "month")?.value || "1");
  const day = Number(parts.find((p) => p.type === "day")?.value || "1");
  // 9:00 AM Manila is 01:00 UTC (UTC+8, no DST)
  return new Date(Date.UTC(y, m - 1, day + 1, 1, 0, 0, 0));
}

function isGradOsdSelected(payload: AnyObj): boolean {
  return String(payload.taxRateMethod || "").trim().toUpperCase() === "GRAD_OSD";
}

function isBlockedAtc(payload: AnyObj): boolean {
  const atc = String(payload.atc || "").trim().toUpperCase();
  return atc === "II012" || atc === "II014" || atc === "II015";
}

function shouldSoftBlockSubmission(payload: AnyObj): boolean {
  return isGradOsdSelected(payload) || isBlockedAtc(payload);
}

function addBusinessDays(start: Date, businessDays: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < businessDays) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    // 0 = Sunday, 6 = Saturday
    if (day !== 0 && day !== 6) added += 1;
  }
  return d;
}

function safeParseObject(raw: unknown): AnyObj {
  if (!raw || typeof raw !== "string") return {};
  try {
    const out = JSON.parse(raw);
    return out && typeof out === "object" && !Array.isArray(out) ? (out as AnyObj) : {};
  } catch {
    return {};
  }
}

function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
}

function mergeSubmitPayload(saved: AnyObj, incoming: AnyObj): AnyObj {
  const merged: AnyObj = { ...saved, ...incoming };

  // Keep richer values from saved payload when incoming is blank (stale/partial submit)
  for (const [k, savedVal] of Object.entries(saved)) {
    const inVal = incoming[k];
    if (isBlank(inVal) && !isBlank(savedVal)) merged[k] = savedVal;
  }

  // Merge Part IV per cell key so page 2 data is preserved.
  const savedPart4 = saved.part4;
  const inPart4 = incoming.part4;
  if (
    savedPart4 &&
    typeof savedPart4 === "object" &&
    !Array.isArray(savedPart4) &&
    inPart4 &&
    typeof inPart4 === "object" &&
    !Array.isArray(inPart4)
  ) {
    const outPart4: AnyObj = { ...(savedPart4 as AnyObj), ...(inPart4 as AnyObj) };
    for (const [k, sv] of Object.entries(savedPart4 as AnyObj)) {
      const iv = (inPart4 as AnyObj)[k];
      if (isBlank(iv) && !isBlank(sv)) outPart4[k] = sv;
    }
    merged.part4 = outPart4;
  } else if (savedPart4 && (!inPart4 || typeof inPart4 !== "object")) {
    merged.part4 = savedPart4;
  }

  return merged;
}

export async function POST(req: Request) {
  try {
    if (await isDeadlinePassedEnabled()) {
      return NextResponse.json({ ok: false, redirect: "/evaluation-deadline-passed" }, { status: 503 });
    }

    if (await isHighVolumeEnabled()) {
      return NextResponse.json({ ok: false, redirect: "/evaluation-high-volume" }, { status: 503 });
    }

    const userId = getAuthedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized — please sign in again." }, { status: 401 });
    }

    const { evaluationId, payload } = await req.json();

    if (!evaluationId || !payload) {
      return NextResponse.json({ error: "Invalid request — missing evaluation or form data." }, { status: 400 });
    }

    let evalRow = await prisma.evaluation.findUnique({
      where: { id: String(evaluationId) },
      include: { referralEvent: true, user: true },
    });
    if (!evalRow || evalRow.userId !== userId) {
      return NextResponse.json({ error: "Evaluation not found." }, { status: 404 });
    }

    // Referred users have a ReferralEvent row; the draft Evaluation should reference it. If it does not
    // (e.g. a newer evaluation was created without the link), attach before crediting the referrer.
    if (!evalRow.referralEventId) {
      const refEvt = await prisma.referralEvent.findUnique({
        where: { referredUserId: userId },
      });
      if (refEvt) {
        await prisma.evaluation.update({
          where: { id: evalRow.id },
          data: { referralEventId: refEvt.id },
        });
        evalRow = await prisma.evaluation.findUnique({
          where: { id: evalRow.id },
          include: { referralEvent: true, user: true },
        });
        if (!evalRow) {
          return NextResponse.json({ error: "Evaluation not found." }, { status: 404 });
        }
      }
    }

    const incomingPayload =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as AnyObj)
        : {};
    const savedPayload = safeParseObject(evalRow.payloadJson);
    const finalPayload = mergeSubmitPayload(savedPayload, incomingPayload);
    const payloadJson = JSON.stringify(finalPayload);

    // Business rule (soft block): Item 19 = GRAD_OSD OR ATC II012/II014/II015
    // should redirect to thank-you, queue no-reduction email, and NOT create submission rows.
    if (shouldSoftBlockSubmission(finalPayload)) {
      const customerEmail = evalRow.user?.email?.trim();
      const customerName = evalRow.user?.fullName?.trim() || "Client";
      if (customerEmail) {
        const noReductionTpl = await renderClientEmailTemplate("EVALUATION_NO_REDUCTION_UPDATE", {
          customerName,
        });
        const existingQueued = await prisma.scheduledEmail.findFirst({
          where: {
            type: "EVALUATION_NO_REDUCTION_UPDATE",
            evaluationId: evalRow.id,
            userId,
            sentAt: null,
            failedAt: null,
          },
          select: { id: true },
        });
        if (!existingQueued) {
          await prisma.scheduledEmail.create({
            data: {
              type: "EVALUATION_NO_REDUCTION_UPDATE",
              toEmail: customerEmail,
              subject: noReductionTpl.subject,
              body: noReductionTpl.textBody,
              sendAt: nextDayAtNineAM(new Date()),
              evaluationId: evalRow.id,
              userId,
            },
          });
        }
      }
      // Keep this out of admin evaluation submissions.
      await prisma.evaluation.update({
        where: { id: evalRow.id },
        data: { payloadJson },
      });
      return NextResponse.json({ ok: true, redirect: "/evaluation-submitted" });
    }

    const salesValue = extractSalesValue(finalPayload);
    const { min, max } = await getSalesFeesLimits();
    const minValue = parseAmountLikeInput(min);
    const maxValue = parseAmountLikeInput(max);

    if (salesValue !== null) {
      if (minValue !== null && salesValue < minValue) {
        return NextResponse.json(
          {
            error: buildBelowMinimumMessage(minValue),
          },
          { status: 400 }
        );
      }
      if (maxValue !== null && salesValue > maxValue) {
        const customerEmail = evalRow.user?.email?.trim();
        const customerName = evalRow.user?.fullName?.trim() || "Client";
        if (customerEmail) {
          const noReductionTpl = await renderClientEmailTemplate("EVALUATION_NO_REDUCTION_UPDATE", {
            customerName,
          });
          const existingQueued = await prisma.scheduledEmail.findFirst({
            where: {
              type: "EVALUATION_NO_REDUCTION_UPDATE",
              evaluationId: evalRow.id,
              userId,
              sentAt: null,
              failedAt: null,
            },
            select: { id: true },
          });

          if (!existingQueued) {
            await prisma.scheduledEmail.create({
              data: {
                type: "EVALUATION_NO_REDUCTION_UPDATE",
                toEmail: customerEmail,
                subject: noReductionTpl.subject,
                body: noReductionTpl.textBody,
                sendAt: nextDayAtNineAM(new Date()),
                evaluationId: evalRow.id,
                userId,
              },
            });
          }
        }
        return NextResponse.json(
          {
            error:
              "Based on your submitted details, we found no meaningful tax reduction opportunity at this time. We sent a follow-up update to your email.",
          },
          { status: 400 }
        );
      }
    }

    const priorSubmitCount = evalRow.submit1701aCount ?? 0;
    const submitOrdinalForPdf = priorSubmitCount + 1;

    const pdfBytes = await generate1701aPdf(finalPayload, {
      accountEmail: evalRow.user?.email ?? null,
      submit1701aCount: submitOrdinalForPdf,
      renderMode: "processed",
    });
    const pdfBuffer = Buffer.from(pdfBytes);

    const pdfSnapshotBytes = await generate1701aPdf(finalPayload, {
      accountEmail: evalRow.user?.email ?? null,
      submit1701aCount: submitOrdinalForPdf,
      renderMode: "verbatim",
    });
    const pdfSnapshotBuffer = Buffer.from(pdfSnapshotBytes);

    const pdfFilename = `evaluation_${evalRow.id}.pdf`;
    const pdfSnapshotFilename = `evaluation_${evalRow.id}_client.pdf`;
    // Serverless / read-only FS: skip disk; admin PDF regenerates from payloadJson.
    let pdfPath: string;
    let pdfSizeBytes: number;
    let clientSnapshotPdfPath: string;
    let clientSnapshotPdfSizeBytes: number;
    const uploadsDir = path.join(process.cwd(), "uploads", "evaluations");
    const diskPath = path.join(uploadsDir, pdfFilename);
    const diskSnapshotPath = path.join(uploadsDir, pdfSnapshotFilename);
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(diskPath, pdfBuffer);
      const stat = await fs.stat(diskPath);
      pdfPath = diskPath;
      pdfSizeBytes = stat.size;
    } catch (diskErr) {
      console.warn("1701A_PDF_DISK_SKIP:", diskErr);
      pdfPath = `__inline__/${pdfFilename}`;
      pdfSizeBytes = pdfBuffer.length;
    }
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(diskSnapshotPath, pdfSnapshotBuffer);
      const stat = await fs.stat(diskSnapshotPath);
      clientSnapshotPdfPath = diskSnapshotPath;
      clientSnapshotPdfSizeBytes = stat.size;
    } catch (diskErr2) {
      console.warn("1701A_CLIENT_PDF_DISK_SKIP:", diskErr2);
      clientSnapshotPdfPath = `__inline_client__/${pdfSnapshotFilename}`;
      clientSnapshotPdfSizeBytes = pdfSnapshotBuffer.length;
    }

    await prisma.$transaction(async (tx) => {
      // Recreate submission row on every submit so admin listing (createdAt desc)
      // always reflects the latest submission event.
      await tx.evaluation1701ASubmission.deleteMany({
        where: { evaluationId: evalRow.id },
      });

      await tx.evaluation1701ASubmission.create({
        data: {
          evaluationId: evalRow.id,
          userId,
          payloadJson,
          pdfFilename,
          pdfPath,
          pdfMimeType: "application/pdf",
          pdfSizeBytes,
          clientSnapshotPdfFilename: pdfSnapshotFilename,
          clientSnapshotPdfPath,
          clientSnapshotPdfMimeType: "application/pdf",
          clientSnapshotPdfSizeBytes,
        },
      });

      await tx.evaluation.update({
        where: { id: evalRow.id },
        data: {
          status: "SUBMITTED",
          payloadJson,
        },
      });
    });

    // Quote tab hides accounts after a successful quote email; a new submission should list them again.
    const quoteListEmail = evalRow.user?.email?.trim();
    if (quoteListEmail) {
      await unmarkQuoteRecipientEmailSent(quoteListEmail).catch(() => {});
    }

    // Keep outside the transaction: if the column is missing (DB not migrated), submit still succeeds.
    try {
      await prisma.$executeRaw`
        UPDATE "Evaluation"
        SET "submit1701aCount" = COALESCE("submit1701aCount", 0) + 1
        WHERE id = ${evalRow.id}
      `;
    } catch (e) {
      console.warn("SUBMIT1701A_COUNT_INCREMENT_SKIPPED", e);
    }

    // Credit referrer by referred user id — does not depend on evaluation.referralEventId (often missing).
    await prisma.referralEvent.updateMany({
      where: { referredUserId: userId, evaluationCompleted: false },
      data: { evaluationCompleted: true },
    });

    const submitterName = evalRow.user?.fullName || evalRow.user?.email || userId;
    const notifyTo = config.evaluationPdfNotifyEmail;
    const attachmentName = `1701A-Evaluation-${evalRow.id}.pdf`;

    if (config.evaluationSubmitNotifyAdmin && notifyTo) {
      try {
        const adminNotifyText = joinTextParagraphs([
          `A client submitted their 1701A evaluation form.`,
          `Evaluation ID: ${evalRow.id}
Submitted by: ${submitterName}
Account email: ${evalRow.user?.email ?? "(unknown)"}`,
          `The completed form is attached as a PDF.`,
        ]);
        await sendMailWithAttachments(
          notifyTo,
          `1701A evaluation submitted — ${submitterName}`,
          adminNotifyText,
          [
            {
              filename: attachmentName,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
          wrapEmailMainHtml(textToEmailHtmlParagraphs(adminNotifyText), clientEmailBranding())
        );
      } catch (mailErr) {
        console.error("EVALUATION_SUBMIT_EMAIL_FAILED:", mailErr);
      }
    }

    // Queue a client follow-up email (next business day) with a login-protected payment link.
    try {
      const customerEmail = evalRow.user?.email?.trim();
      const customerName = evalRow.user?.fullName?.trim() || "Client";
      if (customerEmail) {
        const paymentUrl = `${config.baseUrl}/account/payment`;
        const sendAt = addBusinessDays(new Date(), 1);

        const existingQueued = await prisma.scheduledEmail.findFirst({
          where: {
            type: "EVALUATION_PAYMENT_FOLLOWUP",
            evaluationId: evalRow.id,
            userId: userId,
            sentAt: null,
            failedAt: null,
          },
          select: { id: true },
        });

        if (!existingQueued) {
          const followupTpl = await renderClientEmailTemplate("EVALUATION_PAYMENT_FOLLOWUP", {
            customerName,
            paymentUrl,
            siteName: config.siteName,
          });
          await prisma.scheduledEmail.create({
            data: {
              type: "EVALUATION_PAYMENT_FOLLOWUP",
              toEmail: customerEmail,
              subject: followupTpl.subject,
              body: followupTpl.textBody,
              sendAt,
              evaluationId: evalRow.id,
              userId: userId,
            },
          });
        }
      }
    } catch (queueErr) {
      console.error("EVALUATION_SUBMIT_QUEUE_EMAIL_FAILED:", queueErr);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("SUBMIT_1701A_ERROR:", e);
    const hint =
      process.env.NODE_ENV !== "production" && e instanceof Error ? e.message : "";
    return NextResponse.json(
      {
        error: "Server error while submitting. If this persists, try Save and contact support.",
        ...(hint ? { detail: hint } : {}),
      },
      { status: 500 }
    );
  }
}
