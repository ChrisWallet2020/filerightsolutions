import { prisma } from "@/lib/db";
import { kickScheduledEmailDispatch } from "@/lib/email/scheduledDispatchKick";

export type QueueScheduledEmailInput = {
  type: string;
  toEmail: string;
  subject: string;
  body: string;
  sendAt?: Date;
  evaluationId?: string | null;
  userId?: string | null;
  idempotencyKey?: string | null;
};

export async function queueScheduledEmail(input: QueueScheduledEmailInput): Promise<{ queued: boolean; id: string | null }> {
  const toEmail = String(input.toEmail || "").trim().toLowerCase();
  const subject = String(input.subject || "").trim();
  const body = String(input.body || "").trim();
  if (!toEmail || !subject || !body) {
    throw new Error("queueScheduledEmail requires toEmail, subject, and body.");
  }

  const sendAt = input.sendAt ?? new Date();
  const idem = input.idempotencyKey?.trim() || null;

  if (idem) {
    const existing = await prisma.scheduledEmail.findUnique({
      where: { idempotencyKey: idem },
      select: { id: true },
    });
    if (existing) return { queued: false, id: existing.id };
  }

  const created = await prisma.scheduledEmail.create({
    data: {
      type: input.type.trim(),
      toEmail,
      subject,
      body,
      sendAt,
      ...(input.evaluationId ? { evaluationId: input.evaluationId } : {}),
      ...(input.userId ? { userId: input.userId } : {}),
      ...(idem ? { idempotencyKey: idem } : {}),
    },
    select: { id: true },
  });

  // Best-effort immediate dispatch so queued emails do not wait for scheduler windows.
  kickScheduledEmailDispatch("queueScheduledEmail");

  return { queued: true, id: created.id };
}
