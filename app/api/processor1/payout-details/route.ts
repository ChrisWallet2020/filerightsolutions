import { NextResponse } from "next/server";
import { z } from "zod";
import { getProcessor1SessionInfo, isProcessor1Authed } from "@/lib/auth";
import {
  getProcessor1Credentials,
  getProcessor1PayoutDetails,
  setProcessor1PayoutDetails,
  type ProcessorPayoutMethod,
} from "@/lib/siteSettings";

const Body = z.object({
  method: z.enum(["online_banking", "e_wallet"]).default("e_wallet"),
  provider: z.string().max(120).default(""),
  accountName: z.string().max(120).default(""),
  accountNumber: z.string().max(40).default(""),
});

function normalizeMethod(raw: string): ProcessorPayoutMethod {
  return raw === "online_banking" ? "online_banking" : "e_wallet";
}

export async function GET() {
  const creds = await getProcessor1Credentials();
  if (!isProcessor1Authed(creds.username)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const session = getProcessor1SessionInfo();
  const details = await getProcessor1PayoutDetails(session?.actorKey);
  return NextResponse.json({ ok: true, ...details });
}

export async function PUT(req: Request) {
  const creds = await getProcessor1Credentials();
  if (!isProcessor1Authed(creds.username)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const session = getProcessor1SessionInfo();

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload", message: "Invalid payout details payload." }, { status: 400 });
  }

  const method = normalizeMethod(parsed.data.method);
  const provider = parsed.data.provider.trim();
  const accountName = parsed.data.accountName.trim();
  const accountNumber = parsed.data.accountNumber.trim();

  if (!provider || !accountName || !accountNumber) {
    return NextResponse.json(
      { error: "required_fields", message: "Provider, account name, and account number are required." },
      { status: 400 }
    );
  }

  await setProcessor1PayoutDetails({ method, provider, accountName, accountNumber }, session?.actorKey);
  return NextResponse.json({ ok: true });
}
