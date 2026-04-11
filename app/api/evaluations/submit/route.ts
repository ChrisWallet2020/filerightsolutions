import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { getAuthedUserId } from "@/lib/auth";
import { getSalesFeesLimits, isDeadlinePassedEnabled, isHighVolumeEnabled } from "@/lib/siteSettings";
import { emailSignatureText, joinTextParagraphs } from "@/lib/email/formatting";

/**
 * Minimal PDF generator (no external libs).
 * Produces a valid single-page PDF with basic text.
 */
function makeSimplePdf(textLines: string[]): Buffer {
  // Basic PDF objects
  const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const content = [
    "BT",
    "/F1 12 Tf",
    "72 760 Td",
    ...textLines.flatMap((line, i) => {
      const yMove = i === 0 ? "" : "0 -16 Td";
      return [yMove, `(${escape(line)}) Tj`].filter(Boolean);
    }),
    "ET",
  ].join("\n");

  // PDF structure
  const objs: string[] = [];
  objs.push(`1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`);
  objs.push(`2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj`);
  objs.push(
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj`
  );
  objs.push(`4 0 obj << /Length ${Buffer.byteLength(content, "utf8")} >> stream\n${content}\nendstream endobj`);
  objs.push(`5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);

  let pdf = "%PDF-1.4\n";
  const xref: number[] = [0];
  for (const obj of objs) {
    xref.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj + "\n";
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += "xref\n";
  pdf += `0 ${xref.length}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < xref.length; i++) {
    pdf += `${String(xref[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += "trailer\n";
  pdf += `<< /Size ${xref.length} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefStart}\n`;
  pdf += "%%EOF\n";

  return Buffer.from(pdf, "utf8");
}

function parseAmountLikeInput(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const cleaned = v.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

function extractSalesValue(payload: Record<string, string>): number | null {
  const fromGrossSales = parseAmountLikeInput(payload["grossSales"]);
  const from36A = parseAmountLikeInput(payload["part4.36A"] ?? payload["36A"]);
  const from47A = parseAmountLikeInput(payload["part4.47A"] ?? payload["47A"]);

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
  return joinTextParagraphs([
    `Dear ${customerName},`,
    "After reviewing your details, we found no meaningful tax reduction opportunity based on applicable rules and allowable adjustments.",
    "At this level, the available deductions, credits, and optimization strategies typically result in minimal or no material difference in the final tax payable. As part of our commitment to transparency and value, we only recommend proceeding when there is a clear and beneficial outcome for you.",
    "For this reason, we are unable to proceed with further processing at this time.",
    "Thank you for your understanding and for considering our services.",
    emailSignatureText("Reiner"),
  ]);
}

export async function POST(req: Request) {
  if (await isDeadlinePassedEnabled()) {
    return NextResponse.redirect(new URL("/evaluation-deadline-passed", req.url), 303);
  }

  if (await isHighVolumeEnabled()) {
    return NextResponse.redirect(new URL("/evaluation-high-volume", req.url), 303);
  }

  const userId = getAuthedUserId();
  if (!userId) return NextResponse.redirect(new URL("/login", req.url));

  const form = await req.formData();

  // Build a plain object from form fields
  const payload: Record<string, string> = {};
  form.forEach((v, k) => {
    payload[k] = typeof v === "string" ? v : "";
  });

  const salesValue = extractSalesValue(payload);
  const { min, max } = await getSalesFeesLimits();
  const minValue = parseAmountLikeInput(min);
  const maxValue = parseAmountLikeInput(max);
  if (salesValue !== null) {
    if (minValue !== null && salesValue < minValue) {
      return new NextResponse(buildBelowMinimumMessage(minValue), { status: 400 });
    }
    if (maxValue !== null && salesValue > maxValue) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, fullName: true },
      });
      const customerEmail = user?.email?.trim();
      const customerName = user?.fullName?.trim() || "Client";
      if (customerEmail) {
        const pendingDraft = await prisma.evaluation.findFirst({
          where: { userId, status: "DRAFT" },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        const existingQueued = await prisma.scheduledEmail.findFirst({
          where: {
            type: "EVALUATION_NO_REDUCTION_UPDATE",
            evaluationId: pendingDraft?.id ?? null,
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
              ...(pendingDraft?.id ? { evaluationId: pendingDraft.id } : {}),
              userId,
            },
          });
        }
      }
    }
  }

  // Ensure there is a draft evaluation we can submit
  let evaluation = await prisma.evaluation.findFirst({
    where: { userId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });

  const refEvtForUser = await prisma.referralEvent.findUnique({
    where: { referredUserId: userId },
  });

  if (!evaluation) {
    evaluation = await prisma.evaluation.create({
      data: {
        userId,
        status: "DRAFT",
        ...(refEvtForUser ? { referralEventId: refEvtForUser.id } : {}),
      },
    });
  } else if (!evaluation.referralEventId && refEvtForUser) {
    evaluation = await prisma.evaluation.update({
      where: { id: evaluation.id },
      data: { referralEventId: refEvtForUser.id },
    });
  }

  // Mark evaluation as submitted (and attach taxYear if provided)
  const taxYear = payload["taxYear"] || undefined;

  evaluation = await prisma.evaluation.update({
    where: { id: evaluation.id },
    data: {
      status: "SUBMITTED",
      taxYear: taxYear ?? undefined,
    },
  });

  await prisma.referralEvent.updateMany({
    where: { referredUserId: userId, evaluationCompleted: false },
    data: { evaluationCompleted: true },
  });

  // Create PDF text summary (admin downloads a PDF copy)
  const summaryLines: string[] = [
    "BIR FORM 1701A - CLIENT ENCODED COPY",
    `Evaluation ID: ${evaluation.id}`,
    `User ID: ${userId}`,
    taxYear ? `Tax Year: ${taxYear}` : "Tax Year: (not provided)",
    " ",
    "NOTE: This PDF is a system-generated copy of what the client encoded.",
  ];

  const pdfBuf = makeSimplePdf(summaryLines);

  // Save PDF to disk
  const storageDir = path.join(process.cwd(), "storage", "evaluations");
  await fs.mkdir(storageDir, { recursive: true });

  const submissionId = (await prisma.evaluation1701ASubmission.findUnique({
    where: { evaluationId: evaluation.id },
    select: { id: true },
  }))?.id;

  // If submission exists, delete old file and replace record; else create new
  const newId = submissionId ?? (await prisma.evaluation1701ASubmission.create({
    data: {
      evaluationId: evaluation.id,
      userId,
      payloadJson: JSON.stringify(payload),
      pdfFilename: "1701A_Evaluation.pdf",
      pdfPath: "PENDING",
      pdfMimeType: "application/pdf",
      pdfSizeBytes: 0,
    },
    select: { id: true },
  })).id;

  const pdfFilename = `evaluation_${newId}.pdf`;
  const pdfPath = path.join(storageDir, pdfFilename);

  await fs.writeFile(pdfPath, pdfBuf);

  // Upsert the submission row with payload + pdf metadata
  await prisma.evaluation1701ASubmission.upsert({
    where: { evaluationId: evaluation.id },
    create: {
      evaluationId: evaluation.id,
      userId,
      payloadJson: JSON.stringify(payload),
      pdfFilename,
      pdfPath,
      pdfMimeType: "application/pdf",
      pdfSizeBytes: pdfBuf.byteLength,
    },
    update: {
      payloadJson: JSON.stringify(payload),
      pdfFilename,
      pdfPath,
      pdfMimeType: "application/pdf",
      pdfSizeBytes: pdfBuf.byteLength,
    },
  });

  return NextResponse.redirect(new URL("/evaluation-submitted", req.url));
}