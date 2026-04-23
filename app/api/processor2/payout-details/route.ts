import { NextResponse } from "next/server";
import { z } from "zod";
import { isProcessor2Authed } from "@/lib/auth";
import {
  getProcessor2Credentials,
  getProcessor2PayoutDetails,
  setProcessor2PayoutDetails,
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
  const creds = await getProcessor2Credentials();
  if (!isProcessor2Authed(creds.username)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const details = await getProcessor2PayoutDetails();
  return NextResponse.json({ ok: true, ...details });
}

export async function PUT(req: Request) {
  const creds = await getProcessor2Credentials();
  if (!isProcessor2Authed(creds.username)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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

  await setProcessor2PayoutDetails({ method, provider, accountName, accountNumber });
  return NextResponse.json({ ok: true });
}
