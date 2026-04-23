import { NextResponse } from "next/server";
import { z } from "zod";
import { isPaymentQuoteOperatorAuthed, quoteSlotRoleFromRequest } from "@/lib/admin/paymentQuoteAccess";
import {
  deleteStagingForClientEmail,
  listStagingSlotsForViewer,
  normalizeQuoteClientEmail,
  quoteImageStagingLastSavedAt,
} from "@/lib/admin/paymentQuoteStaging";

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
  const [slots, lastSavedAt] = await Promise.all([
    listStagingSlotsForViewer(clientEmail),
    quoteImageStagingLastSavedAt(clientEmail, quoteSlotRoleFromRequest(req)),
  ]);
  return NextResponse.json({
    slots,
    lastSavedAt: lastSavedAt ? lastSavedAt.toISOString() : null,
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
