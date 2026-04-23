import { prisma } from "@/lib/db";

const SITE_KEY = "quote_sent_recipient_emails_v1";
const LEGACY_PRE_SYSTEM_SENT_RECIPIENTS = ["rieno.v.mabanglo@gmail.com"] as const;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseList(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    const out = new Set<string>();
    for (const v of parsed) {
      if (typeof v === "string") out.add(normalizeEmail(v));
    }
    return out;
  } catch {
    return new Set();
  }
}

export async function getSentQuoteRecipientEmails(): Promise<Set<string>> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: SITE_KEY },
    select: { value: true },
  });
  const current = parseList(row?.value);
  const missingLegacy = LEGACY_PRE_SYSTEM_SENT_RECIPIENTS
    .map((email) => normalizeEmail(email))
    .filter((email) => !current.has(email));
  if (missingLegacy.length > 0) {
    missingLegacy.forEach((email) => current.add(email));
    const value = JSON.stringify(Array.from(current.values()).sort());
    await prisma.siteSetting.upsert({
      where: { key: SITE_KEY },
      create: { key: SITE_KEY, value },
      update: { value },
    });
  }
  return current;
}

export async function markQuoteRecipientEmailSent(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const current = await getSentQuoteRecipientEmails();
  if (current.has(normalized)) return;
  current.add(normalized);
  const value = JSON.stringify(Array.from(current.values()).sort());
  await prisma.siteSetting.upsert({
    where: { key: SITE_KEY },
    create: { key: SITE_KEY, value },
    update: { value },
  });
}

export async function unmarkQuoteRecipientEmailSent(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const current = await getSentQuoteRecipientEmails();
  if (!current.has(normalized)) return;
  current.delete(normalized);
  const value = JSON.stringify(Array.from(current.values()).sort());
  await prisma.siteSetting.upsert({
    where: { key: SITE_KEY },
    create: { key: SITE_KEY, value },
    update: { value },
  });
}
