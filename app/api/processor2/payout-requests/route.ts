import { NextResponse } from "next/server";
import { getProcessor2SessionInfo, isProcessor2Authed } from "@/lib/auth";
import { fetchProcessorLedgerSummary } from "@/lib/processorCompensationLedger";
import {
  createProcessorPayoutRequest,
  listProcessorPayoutRequests,
  payoutBreakdown,
} from "@/lib/processorPayoutRequests";
import { getProcessor2Credentials, getProcessor2PayoutDetails } from "@/lib/siteSettings";
import { getProcessorUsernameById } from "@/lib/processorUsers";

const MAX_WITHDRAW_REQUEST_PHP = 100;

export async function GET() {
  const creds = await getProcessor2Credentials();
  if (!isProcessor2Authed(creds.username)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const session = getProcessor2SessionInfo();
  const rows = await listProcessorPayoutRequests("processor2", session?.actorKey || "processor2");
  return NextResponse.json({ ok: true, rows });
}

export async function POST() {
  const creds = await getProcessor2Credentials();
  if (!isProcessor2Authed(creds.username)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const session = getProcessor2SessionInfo();
  const actorKey = session?.actorKey || "processor2";
  const [summary, rows] = await Promise.all([
    fetchProcessorLedgerSummary("processor2", actorKey),
    listProcessorPayoutRequests("processor2", actorKey),
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
    ? ((await getProcessorUsernameById("processor2", session.userId)) ?? "processor2")
    : "processor2";
  const payout = await getProcessor2PayoutDetails(actorKey);
  const request = await createProcessorPayoutRequest({
    role: "processor2",
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
