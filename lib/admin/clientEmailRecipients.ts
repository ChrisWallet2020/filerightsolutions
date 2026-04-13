import { prisma } from "@/lib/db";

export type AdminClientRecipient = {
  email: string;
  fullName: string;
};

/** Registered customer accounts, sorted by full name for admin pickers. */
export async function getAdminClientRecipients(): Promise<AdminClientRecipient[]> {
  const users = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { email: true, fullName: true },
    orderBy: [{ fullName: "asc" }, { email: "asc" }],
  });

  return users.map((u) => ({
    email: u.email.trim(),
    fullName: u.fullName.trim(),
  }));
}
