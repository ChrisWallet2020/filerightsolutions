import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FILING_TASK_STATUS } from "@/lib/constants";
import { ensureFilingTaskForPaidOrder } from "@/lib/filingTasks";

type ActionType = "assign_start" | "mark_ready" | "mark_hold" | "mark_filed" | "mark_qc_done";

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const action = String(form.get("action") || "") as ActionType;
  const orderId = String(form.get("orderId") || "").trim();
  const assigneeName = String(form.get("assigneeName") || "").trim();
  const holdReason = String(form.get("holdReason") || "").trim();
  const filingReference = String(form.get("filingReference") || "").trim();
  const filedByName = String(form.get("filedByName") || "").trim();
  const notes = String(form.get("notes") || "").trim();
  const redir = new URL("/admin/filing-queue", req.url);

  if (!orderId) {
    redir.searchParams.set("taskError", "missing_order");
    return NextResponse.redirect(redir, 303);
  }

  const order = await prisma.order.findUnique({ where: { orderId } });
  if (!order) {
    redir.searchParams.set("taskError", "order_not_found");
    return NextResponse.redirect(redir, 303);
  }

  await ensureFilingTaskForPaidOrder({ id: order.id, paidAt: order.paidAt });

  if (action === "assign_start") {
    await prisma.filingTask.update({
      where: { orderId: order.id },
      data: {
        status: FILING_TASK_STATUS.IN_PROGRESS,
        assigneeName: assigneeName || null,
        startedAt: new Date(),
      },
    });
  } else if (action === "mark_ready") {
    await prisma.filingTask.update({
      where: { orderId: order.id },
      data: {
        status: FILING_TASK_STATUS.READY_TO_FILE,
        holdReason: null,
      },
    });
  } else if (action === "mark_hold") {
    await prisma.filingTask.update({
      where: { orderId: order.id },
      data: {
        status: FILING_TASK_STATUS.ON_HOLD,
        holdReason: holdReason || "Needs admin review",
      },
    });
  } else if (action === "mark_qc_done") {
    await prisma.filingTask.update({
      where: { orderId: order.id },
      data: {
        status: FILING_TASK_STATUS.QC_DONE,
      },
    });
  } else if (action === "mark_filed") {
    if (!filingReference) {
      redir.searchParams.set("taskError", "missing_filing_reference");
      return NextResponse.redirect(redir, 303);
    }
    await prisma.filingTask.update({
      where: { orderId: order.id },
      data: {
        status: FILING_TASK_STATUS.FILED,
        filedAt: new Date(),
        filingReference,
        filedByName: filedByName || assigneeName || null,
        notes: notes || null,
      },
    });
  } else {
    redir.searchParams.set("taskError", "invalid_action");
    return NextResponse.redirect(redir, 303);
  }

  redir.searchParams.set("taskOk", "1");
  return NextResponse.redirect(redir, 303);
}
