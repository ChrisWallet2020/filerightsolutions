import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { createPaymentQuoteAdmin } from "@/lib/admin/paymentQuoteCreate";

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

  const { userEmail, baseAmountPhp, clientNote } = parsed.data;
  const email = userEmail.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const { token } = await createPaymentQuoteAdmin({
    userId: user.id,
    baseAmountPhp,
    clientNote: clientNote?.trim() || null,
    adminMemo: null,
    expiresAt: null,
  });

  const redir = new URL("/admin_dashboard/billing", req.url);
  redir.searchParams.set("newToken", token);
  return NextResponse.redirect(redir, 303);
}
