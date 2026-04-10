// app/api/evaluations/1701a/submit/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { getAuthedUserId } from "@/lib/auth";
import { generate1701aPdf } from "@/lib/pdf1701a";
import { sendMailWithAttachments } from "@/lib/email/mailer";
import { config } from "@/lib/config";
import { getSalesFeesLimits, isDeadlinePassedEnabled, isHighVolumeEnabled } from "@/lib/siteSettings";

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
  return [
    `We regret to inform you that we are currently unable to process requests where total Sales / Revenues / Receipts / Fees are below ${minPeso}.`,
    "",
    "We appreciate your interest in our services, and we hope to assist you in the future should your circumstances change.",
  ].join("\n");
}

function nextDayAtNineAM(start: Date): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

function buildNoReductionEmailBody(customerName: string): string {
  return [
    `Dear ${customerName},`,
    "",
    "After reviewing your details, we found no meaningful tax reduction opportunity based on applicable rules and allowable adjustments.",
    "",
    "At this level, the available deductions, credits, and optimization strategies typically result in minimal or no material difference in the final tax payable. As part of our commitment to transparency and value, we only recommend proceeding when there is a clear and beneficial outcome for you.",
    "",
    "For this reason, we are unable to proceed with further processing at this time.",
    "",
    "Thank you for your understanding and for considering our services.",
    "",
    "Sincerely,",
    "Reiner",
  ].join("\n");
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
                subject: "Update on Your Tax Evaluation",
                body: buildNoReductionEmailBody(customerName),
                sendAt: nextDayAtNineAM(new Date()),
                evaluationId: evalRow.id,
                userId,
              },
            });
          }
        }
      }
    }

    const pdfBytes = await generate1701aPdf(finalPayload);
    const pdfBuffer = Buffer.from(pdfBytes);

    const pdfFilename = `evaluation_${evalRow.id}.pdf`;
    // Serverless / read-only FS: skip disk; admin PDF regenerates from payloadJson.
    let pdfPath: string;
    let pdfSizeBytes: number;
    const uploadsDir = path.join(process.cwd(), "uploads", "evaluations");
    const diskPath = path.join(uploadsDir, pdfFilename);
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
        },
      });
    });

    await prisma.evaluation.update({
      where: { id: evalRow.id },
      data: { status: "SUBMITTED", payloadJson },
    });

    if (evalRow.referralEventId) {
      await prisma.referralEvent.update({
        where: { id: evalRow.referralEventId },
        data: { evaluationCompleted: true },
      });
    }

    const submitterName = evalRow.user?.fullName || evalRow.user?.email || userId;
    const notifyTo = config.evaluationPdfNotifyEmail;
    const attachmentName = `1701A-Evaluation-${evalRow.id}.pdf`;

    try {
      await sendMailWithAttachments(
        notifyTo,
        `1701A evaluation submitted — ${submitterName}`,
        [
          `A client submitted their 1701A evaluation form.`,
          ``,
          `Evaluation ID: ${evalRow.id}`,
          `Submitted by: ${submitterName}`,
          `Account email: ${evalRow.user?.email ?? "(unknown)"}`,
          ``,
          `The completed form is attached as a PDF.`,
        ].join("\n"),
        [
          {
            filename: attachmentName,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ]
      );
    } catch (mailErr) {
      console.error("EVALUATION_SUBMIT_EMAIL_FAILED:", mailErr);
    }

    // Queue a client follow-up email (next 1-2 business days) with a login-protected payment link.
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
          await prisma.scheduledEmail.create({
            data: {
              type: "EVALUATION_PAYMENT_FOLLOWUP",
              toEmail: customerEmail,
              subject: "Your 1701A evaluation is received — payment link",
              body: [
                `Hello ${customerName},`,
                ``,
                `Thank you — we have received your BIR Form 1701A evaluation.`,
                `Our team will review your submission and send the next steps within 1-2 business days.`,
                ``,
                `When advised to proceed, open this link (sign in if asked — you will be returned to Payment):`,
                paymentUrl,
                ``,
                `If you already have a billing link with a quote code in your email, use that link instead; it opens your bill after sign-in.`,
                ``,
                `Sincerely,`,
                `Reiner`,
                ``,
                `${config.siteName}`,
              ].join("\n"),
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
