import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthedAgentUserId } from "@/lib/auth";
import { isValidGcashMobile, normalizeGcashMobileInput } from "@/lib/agentGcash";

const PutBody = z.object({
  gcashNumber: z.string().max(24).optional().default(""),
  gcashAccountName: z.string().max(120).optional().default(""),
});

export async function GET() {
  const agentId = await getAuthedAgentUserId();
  if (!agentId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: agentId },
    select: { agentPayoutGcashNumber: true, agentPayoutGcashAccountName: true },
  });

  return NextResponse.json({
    ok: true,
    gcashNumber: user?.agentPayoutGcashNumber ?? "",
    gcashAccountName: user?.agentPayoutGcashAccountName ?? "",
  });
}

export async function PUT(req: Request) {
  const agentId = await getAuthedAgentUserId();
  if (!agentId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = PutBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const rawNum = normalizeGcashMobileInput(parsed.data.gcashNumber);
  const name = parsed.data.gcashAccountName.trim();

  if (!rawNum && !name) {
    await prisma.user.update({
      where: { id: agentId },
      data: { agentPayoutGcashNumber: null, agentPayoutGcashAccountName: null },
    });
    return NextResponse.json({ ok: true });
  }

  if (rawNum && !isValidGcashMobile(rawNum)) {
    return NextResponse.json(
      { error: "invalid_gcash", message: "GCash number must be 11 digits starting with 09 (e.g. 09171234567)." },
      { status: 400 }
    );
  }

  if (rawNum && name.length < 2) {
    return NextResponse.json(
      { error: "invalid_name", message: "Enter the name as registered on GCash (at least 2 characters)." },
      { status: 400 }
    );
  }

  if (!rawNum && name) {
    return NextResponse.json(
      { error: "number_required", message: "Enter a GCash mobile number when you provide an account name." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: agentId },
    data: {
      agentPayoutGcashNumber: rawNum,
      agentPayoutGcashAccountName: name,
    },
  });

  return NextResponse.json({ ok: true });
}
