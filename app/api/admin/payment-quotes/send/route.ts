import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isPaymentQuoteOperatorAuthed,
  paymentQuoteReturnUrl,
  quoteSlotRoleFromRequest,
} from "@/lib/admin/paymentQuoteAccess";
import { sendBillingQuoteToUserEmail } from "@/lib/admin/sendBillingQuote";

const serviceFeeOverrideSchema = z
  .union([z.string(), z.number(), z.undefined()])
  .transform((value) => {
    if (value == null) return null;
    const raw = typeof value === "number" ? String(value) : value.trim();
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return Number.NaN;
    return n;
  })
  .refine((value) => value === null || (Number.isInteger(value) && value >= 1 && value <= 1_000_000), {
    message: "service_fee_override_must_be_integer_php_1_to_1000000",
  });

const Schema = z.object({
  userEmail: z.string().email(),
  clientNote: z.string().max(2000).optional().or(z.literal("")),
  serviceFeeOverridePhp: serviceFeeOverrideSchema.optional(),
});

export async function POST(req: Request) {
  if (!(await isPaymentQuoteOperatorAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") || "";
  let raw: Record<string, unknown>;
  if (ct.includes("application/json")) {
    raw = await req.json().catch(() => ({}));
  } else {
    const form = await req.formData();
    raw = Object.fromEntries(form.entries());
  }

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 400 });
  }

  const { userEmail, clientNote, serviceFeeOverridePhp } = parsed.data;
  const canOverrideFee = quoteSlotRoleFromRequest(req) === "admin";
  const result = await sendBillingQuoteToUserEmail({
    userEmail,
    clientNote: clientNote?.trim() || null,
    serviceFeeOverridePhp: canOverrideFee ? (serviceFeeOverridePhp ?? null) : null,
  });
  if (!result.ok) {
    const redir = new URL(paymentQuoteReturnUrl(req), req.url);
    redir.searchParams.set("quoteError", result.code);
    return NextResponse.redirect(redir, 303);
  }

  const redir = new URL(paymentQuoteReturnUrl(req), req.url);
  redir.searchParams.set("newToken", result.token || "");
  redir.searchParams.set("emailed", result.emailSent ? "1" : "0");
  if (result.emailDevLog) {
    redir.searchParams.set("emailDev", "1");
  }
  if (result.usedFallbackSend) {
    redir.searchParams.set("emailFallback", "1");
  }
  if (result.emailError) {
    redir.searchParams.set("emailError", "1");
    if (result.emailFailureReason) {
      redir.searchParams.set("emailReason", result.emailFailureReason);
    }
  }
  return NextResponse.redirect(redir, 303);
}
