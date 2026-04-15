import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { applyAgentSessionToResponse } from "@/lib/auth";
import { z } from "zod";

const Body = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, role: true, agentPortalEnabled: true },
  });
  if (!user) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const canAgent = user.role === "AGENT" || user.agentPortalEnabled;
  if (!canAgent) {
    return NextResponse.json(
      {
        error: "agent_portal_not_enabled",
        message:
          "This is a client account but agent access is not enabled yet. Use Create agent account with the same email and your current password once, then sign in here.",
      },
      { status: 403 }
    );
  }

  const res = NextResponse.json({ ok: true });
  applyAgentSessionToResponse(res, user.id);
  return res;
}
