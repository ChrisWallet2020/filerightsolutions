import { NextResponse } from "next/server";
import { clearUserSession } from "@/lib/auth";

export async function POST(req: Request) {
  clearUserSession();
  return NextResponse.redirect(new URL("/login", req.url));
}