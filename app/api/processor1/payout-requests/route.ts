import { NextResponse } from "next/server";
import { getProcessor1SessionInfo, isProcessor1Authed } from "@/lib/auth";
import { fetchProcessorLedgerSummary } from "@/lib/processorCompensationLedger";
import {
  createProcessorPayoutRequest,
  listProcessorPayoutRequests,
  payoutBreakdown,
} from "@/lib/processorPayoutRequests";
import { getProcessor1Credentials, getProcessor1PayoutDetails } from "@/lib/siteSettings";
import { getProcessorUsernameById } from "@/lib/processorUsers";

const MAX_WITHDRAW_REQUEST_PHP = 100;

export async function GET() {
  const creds = await getProcessor1Credentials();
  if (!isProcessor1Authed(creds.username)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const session = getProcessor1SessionInfo();
  const rows = await listProcessorPayoutRequests("processor1", session?.actorKey || "processor1");
  return NextResponse.json({ ok: true, rows });
}

export async function POST() {
  const creds = await getProcessor1Credentials();
  if (!isProcessor1Authed(creds.username)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const session = getProcessor1SessionInfo();
  const actorKey = session?.actorKey || "processor1";
  const [summary, rows] = await Promise.all([
    fetchProcessorLedgerSummary("processor1", actorKey),
    listProcessorPayoutRequests("processor1", actorKey),
  ]);
  const { approvedPhp, pendingPhp } = payoutBreakdown(rows);
  const availablePhp = Math.max(0, summary.allGrand - approvedPhp - pendingPhp);
  if (availablePhp <= 0) {
    return NextResponse.json(
      { error: "no_balance", message: "No available balance yet. Earned amounts or pending withdrawals may be zero." },
      { status: 400 }
    );
  }

  const username = session?.userId
    ? ((await getProcessorUsernameById("processor1", session.userId)) ?? "processor1")
    : "processor1";
  const payout = await getProcessor1PayoutDetails(actorKey);
  const request = await createProcessorPayoutRequest({
    role: "processor1",
    requesterActorKey: actorKey,
    amountPhp: Math.min(availablePhp, MAX_WITHDRAW_REQUEST_PHP),
    requesterUsername: username,
    payoutMethod: payout.method,
    payoutProvider: payout.provider,
    payoutAccountName: payout.accountName,
    payoutAccountNumber: payout.accountNumber,
  });
  return NextResponse.json({ ok: true, request });
}
