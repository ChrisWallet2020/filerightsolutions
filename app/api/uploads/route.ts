import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import path from "path";
import fs from "fs/promises";
import { EMAIL_TYPE } from "@/lib/constants";

export async function POST(req: Request) {
  const form = await req.formData();
  const uploadToken = String(form.get("uploadToken") || "");
  if (!uploadToken) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { uploadToken } });
  if (!order) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

  const files = form.getAll("files");
  if (!files.length) return NextResponse.json({ error: "No files" }, { status: 400 });

  const uploadDir = path.join(process.cwd(), "uploads", order.orderId);
  await fs.mkdir(uploadDir, { recursive: true });

  let firstUpload = false;
  const existingCount = await prisma.upload.count({ where: { orderId: order.id } });
  if (existingCount === 0) firstUpload = true;

  for (const f of files) {
    if (!(f instanceof File)) continue;
    const arrayBuffer = await f.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    const safeName = f.name.replace(/[^\w.\-() ]+/g, "_");
    const storagePath = path.join(uploadDir, `${Date.now()}_${safeName}`);
    await fs.writeFile(storagePath, buf);

    await prisma.upload.create({
      data: {
        orderId: order.id,
        filename: safeName,
        storagePath,
        mimeType: f.type || "application/octet-stream",
        sizeBytes: buf.length
      }
    });
  }

  if (firstUpload) {
    await prisma.emailLog.upsert({
      where: { orderId_type: { orderId: order.id, type: EMAIL_TYPE.DOCUMENTS_RECEIVED } },
      update: {},
      create: {
        orderId: order.id,
        type: EMAIL_TYPE.DOCUMENTS_RECEIVED,
        toEmail: order.customerEmail,
        subject: `Documents Received – Order ${order.orderId}`
      }
    });
  }

  return NextResponse.redirect(new URL(`/upload/${uploadToken}`, req.url), 303);
}