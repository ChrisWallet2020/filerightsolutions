import { prisma } from "@/lib/db";

/** Unique registered clients who have at least one submitted 1701A evaluation (submission row). */
export async function getSubmitted1701aClientOptions(): Promise<{ email: string; fullName: string }[]> {
  const subs = await prisma.evaluation1701ASubmission.findMany({
    include: { user: { select: { email: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  const byEmail = new Map<string, { email: string; fullName: string }>();
  for (const s of subs) {
    const em = s.user.email.trim().toLowerCase();
    if (!byEmail.has(em)) {
      byEmail.set(em, { email: s.user.email.trim(), fullName: s.user.fullName.trim() });
    }
  }
  return [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email));
}
