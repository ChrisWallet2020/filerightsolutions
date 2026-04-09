import crypto from "crypto";
import { prisma } from "@/lib/db";

export async function createPaymentQuoteAdmin(opts: {
  userId: string;
  baseAmountPhp: number;
  clientNote: string | null;
  adminMemo: string | null;
  expiresAt: Date | null;
}): Promise<{ token: string }> {
  const token = crypto.randomBytes(24).toString("hex");
  await prisma.paymentQuote.create({
    data: {
      token,
      userId: opts.userId,
      baseAmountPhp: opts.baseAmountPhp,
      clientNote: opts.clientNote,
      adminMemo: opts.adminMemo,
      expiresAt: opts.expiresAt,
    },
  });
  return { token };
}
