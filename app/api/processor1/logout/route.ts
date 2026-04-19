import { NextResponse } from "next/server";
import { clearProcessor1Session } from "@/lib/auth";

export async function POST() {
  clearProcessor1Session();
  return NextResponse.redirect(new URL("/processor1_dashboard/login", req.url));
}
