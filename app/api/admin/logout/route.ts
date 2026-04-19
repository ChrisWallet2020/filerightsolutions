import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/auth";

export async function POST(req: Request) {
  clearAdminSession();
  return NextResponse.redirect(new URL("/admin_dashboard/login", req.url));
}

