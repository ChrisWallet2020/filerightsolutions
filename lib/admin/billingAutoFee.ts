import { prisma } from "@/lib/db";

type AnyObj = Record<string, unknown>;

function parseAmount(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return 0;
  const cleaned = v.replace(/,/g, "").replace(/PHP\s*/gi, "").trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function part4Value(part4: AnyObj | null, key: string): number {
  if (!part4) return 0;
  return parseAmount(part4[key]);
}

/**
 * Mirrors downloadable PDF logic for Item 46 (A column):
 * - taxable = 60% of 49A + 50A + 51A
 * - if taxable < 250,000 => 46A = 0
 * - else preserve submitted 46A
 */
function derivedPdf46A(part4: AnyObj | null): number {
  const from49 = part4Value(part4, "49A");
  const from50 = part4Value(part4, "50A");
  const from51 = part4Value(part4, "51A");
  const taxable = from49 * 0.6 + from50 + from51;
  if (taxable < 250_000) return 0;
  return part4Value(part4, "46A");
}

/**
 * Service fee formula:
 * 1000 + 25% * max(0, (56A - derived 46A))
 */
export function computeAutoBillingBaseAmountFromPayload(payloadJson: string | null | undefined): number {
  if (!payloadJson) return 1000;
  let parsed: AnyObj = {};
  try {
    const raw = JSON.parse(payloadJson);
    if (raw && typeof raw === "object" && !Array.isArray(raw)) parsed = raw as AnyObj;
  } catch {
    return 1000;
  }

  const part4 =
    parsed.part4 && typeof parsed.part4 === "object" && !Array.isArray(parsed.part4)
      ? (parsed.part4 as AnyObj)
      : null;
  const tax56 = part4Value(part4, "56A");
  const tax46 = derivedPdf46A(part4);
  const positiveDiff = Math.max(0, tax56 - tax46);
  const fee = 1000 + positiveDiff * 0.25;
  return Math.max(1000, Math.round(fee));
}

export async function getAutoBillingBaseAmountForUser(userId: string): Promise<number> {
  const latest = await prisma.evaluation1701ASubmission.findFirst({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { payloadJson: true },
  });
  return computeAutoBillingBaseAmountFromPayload(latest?.payloadJson);
}

