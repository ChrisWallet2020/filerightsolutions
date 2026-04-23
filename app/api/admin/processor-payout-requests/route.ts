import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { updateProcessorPayoutRequest } from "@/lib/processorPayoutRequests";

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const id = String(form.get("id") || "").trim();
  const status = String(form.get("status") || "").trim();
  const adminNote = String(form.get("adminNote") || "").trim();

  if (!id || (status !== "approved" && status !== "rejected")) {
    return NextResponse.redirect(new URL("/admin_dashboard/income-tracker?error=invalid", req.url), 303);
  }

  const ok = await updateProcessorPayoutRequest({
    id,
    status: status as "approved" | "rejected",
    adminNote,
  });
  if (!ok) {
    return NextResponse.redirect(new URL("/admin_dashboard/income-tracker?error=missing", req.url), 303);
  }

  return NextResponse.redirect(new URL("/admin_dashboard/income-tracker?saved=1", req.url), 303);
}
