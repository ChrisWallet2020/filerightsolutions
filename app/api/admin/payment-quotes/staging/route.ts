import { NextResponse } from "next/server";
import { z } from "zod";
import { isPaymentQuoteOperatorAuthed, quoteSlotRoleFromRequest } from "@/lib/admin/paymentQuoteAccess";
import {
  deleteStagingForClientEmail,
  getActiveSubmissionContextForClientEmail,
  listStagingSlotsForViewer,
  normalizeQuoteClientEmail,
  quoteImageStagingLastSavedAt,
} from "@/lib/admin/paymentQuoteStaging";
import { prisma } from "@/lib/db";

const EmailParam = z.object({
  clientEmail: z.string().email(),
});

export async function GET(req: Request) {
  if (!(await isPaymentQuoteOperatorAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const parsed = EmailParam.safeParse({ clientEmail: url.searchParams.get("clientEmail") || "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_client_email" }, { status: 400 });
  }
  const clientEmail = parsed.data.clientEmail;
  const active = await getActiveSubmissionContextForClientEmail(clientEmail);
  const [slots, lastSavedAt, supersededCount] = await Promise.all([
    listStagingSlotsForViewer(clientEmail),
    quoteImageStagingLastSavedAt(clientEmail, quoteSlotRoleFromRequest(req)),
    active
      ? prisma.paymentQuoteImageStaging.count({
          where: {
            clientEmail: normalizeQuoteClientEmail(clientEmail),
            submissionId: { not: active.submissionId },
          },
        })
      : Promise.resolve(0),
  ]);
  return NextResponse.json({
    slots,
    lastSavedAt: lastSavedAt ? lastSavedAt.toISOString() : null,
    activeSubmissionId: active?.submissionId ?? null,
    activeSubmissionSubmittedAt: active?.submittedAt?.toISOString() ?? null,
    hasSupersededStagingRows: supersededCount > 0,
  });
}

export async function DELETE(req: Request) {
  if (!(await isPaymentQuoteOperatorAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const parsed = EmailParam.safeParse({ clientEmail: url.searchParams.get("clientEmail") || "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_client_email" }, { status: 400 });
  }
  await deleteStagingForClientEmail(normalizeQuoteClientEmail(parsed.data.clientEmail));
  return NextResponse.json({ ok: true });
}
