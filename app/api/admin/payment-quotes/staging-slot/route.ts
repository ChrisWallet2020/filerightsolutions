import { NextResponse } from "next/server";
import { isPaymentQuoteOperatorAuthed, quoteSlotRoleFromRequest } from "@/lib/admin/paymentQuoteAccess";
import { MAX_BILLING_IMAGE_BYTES } from "@/lib/admin/billingAttachments";
import {
  assertSlotAllowedForRole,
  loadStagingSlotImage,
  saveStagingSlot,
} from "@/lib/admin/paymentQuoteStaging";
import {
  getProcessor1SessionInfo,
  getProcessor2SessionInfo,
  isProcessor1Authed,
  isProcessor2Authed,
} from "@/lib/auth";

export async function POST(req: Request) {
  if (!(await isPaymentQuoteOperatorAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const role = quoteSlotRoleFromRequest(req);
  const form = await req.formData();
  const clientEmail = String(form.get("clientEmail") || "").trim();
  const slotRaw = String(form.get("slot") || "").trim();
  const file = form.get("file");

  if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return NextResponse.json({ error: "invalid_client_email" }, { status: 400 });
  }
  const slot = Number(slotRaw);
  if (!Number.isInteger(slot) || slot < 1 || slot > 4) {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  const mt = (file.type || "").trim().toLowerCase();
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  if (!allowed.has(mt)) {
    return NextResponse.json({ error: "attachment_must_be_image" }, { status: 400 });
  }
  if (file.size > MAX_BILLING_IMAGE_BYTES) {
    return NextResponse.json({ error: "attachment_too_large_max_10mb" }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const uploadedByActorKey =
      role === "processor1" && isProcessor1Authed()
        ? getProcessor1SessionInfo()?.actorKey ?? null
        : role === "processor2" && isProcessor2Authed()
          ? getProcessor2SessionInfo()?.actorKey ?? null
          : null;
    await saveStagingSlot({
      clientEmail,
      slot,
      data: buf,
      filename: file.name || `quote-image-${slot}`,
      mimeType: mt || "application/octet-stream",
      uploadedBy: role,
      uploadedByActorKey,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "slot_not_allowed") {
      return NextResponse.json({ error: "slot_not_allowed" }, { status: 403 });
    }
    if (msg === "too_large") {
      return NextResponse.json({ error: "attachment_too_large_max_10mb" }, { status: 400 });
    }
    if (msg === "bad_mime") {
      return NextResponse.json({ error: "attachment_must_be_image" }, { status: 400 });
    }
    if (msg === "duplicate_workspace_filename") {
      return NextResponse.json({ error: "duplicate_workspace_filename" }, { status: 400 });
    }
    console.error("payment-quotes/staging-slot", e);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  if (!(await isPaymentQuoteOperatorAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = quoteSlotRoleFromRequest(req);
  const url = new URL(req.url);
  const clientEmail = String(url.searchParams.get("clientEmail") || "").trim();
  const slot = Number(String(url.searchParams.get("slot") || "").trim());
  if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return NextResponse.json({ error: "invalid_client_email" }, { status: 400 });
  }
  if (!Number.isInteger(slot) || slot < 1 || slot > 4) {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
  }
  try {
    assertSlotAllowedForRole(slot, role);
    const row = await loadStagingSlotImage({ clientEmail, slot });
    return new NextResponse(row.data, {
      status: 200,
      headers: {
        "Content-Type": row.mimeType || "application/octet-stream",
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${encodeURIComponent(row.filename)}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "slot_not_allowed") {
      return NextResponse.json({ error: "slot_not_allowed" }, { status: 403 });
    }
    if (msg === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
