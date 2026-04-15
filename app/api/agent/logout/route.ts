import { NextResponse } from "next/server";
import { clearAgentSession } from "@/lib/auth";

export async function POST() {
  clearAgentSession();
  return NextResponse.json({ ok: true });
}
