import { prisma } from "@/lib/db";

/** Client must have at least one submitted 1701A evaluation (submission row exists). */
export async function findUserWith1701aSubmissionByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  return prisma.user.findFirst({
    where: {
      email: { equals: normalized, mode: "insensitive" },
      evaluation1701ASubmissions: { some: {} },
    },
    select: { id: true, email: true, fullName: true },
  });
}
