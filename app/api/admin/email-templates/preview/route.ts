import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/auth";
import { renderClientEmailTemplatePreview, type TemplateKind } from "@/lib/admin/clientEmailTemplates";

const KindEnum = z.enum([
  "PASSWORD_RESET",
  "REGISTER_WELCOME",
  "BILLING_QUOTE",
  "FILING_COMPLETE_NOTIFY",
  "PAYMENT_RECEIVED_IN_PROGRESS",
  "EVALUATION_NO_REDUCTION_UPDATE",
  "EVALUATION_PAYMENT_FOLLOWUP",
  "BIR_1701A_DEADLINE_REMINDER",
]);

const Body = z.object({
  kind: KindEnum,
  subject: z.string().trim().min(1).max(240),
  textBody: z.string().trim().min(1).max(20000),
});

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const p = parsed.data;
  const preview = await renderClientEmailTemplatePreview(p.kind as TemplateKind, {
    subject: p.subject,
    textBody: p.textBody,
  });
  return NextResponse.json({ ok: true, preview });
}
