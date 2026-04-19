import { NextResponse } from "next/server";
import { clearProcessor2Session } from "@/lib/auth";

export async function POST(req: Request) {
  clearProcessor2Session();
  return NextResponse.redirect(new URL("/processor2_dashboard/login", req.url));
}
