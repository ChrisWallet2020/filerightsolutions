import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { createPaymentQuoteAdmin } from "@/lib/admin/paymentQuoteCreate";

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

  const redir = new URL("/admin/billing", req.url);
  redir.searchParams.set("newToken", token);
  return NextResponse.redirect(redir, 303);
}
