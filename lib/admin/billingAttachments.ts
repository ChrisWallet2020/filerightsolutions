import type { MailAttachment } from "@/lib/email/mailer";

export const BILLING_ATTACHMENT_FIELD_NAMES = ["billingAttachment1", "billingAttachment2", "billingAttachment3"] as const;

export const MAX_BILLING_IMAGE_BYTES = 10 * 1024 * 1024;

export type CollectedBillingImage = MailAttachment;

export async function collectBillingImagesFromFormData(
  form: FormData
): Promise<
  { ok: true; images: CollectedBillingImage[] } | { ok: false; error: "attachment_type" | "attachment_size" }
> {
  const images: CollectedBillingImage[] = [];
  for (const name of BILLING_ATTACHMENT_FIELD_NAMES) {
    const file = form.get(name);
    if (!(file instanceof File) || file.size === 0) continue;
    if (!file.type.startsWith("image/")) return { ok: false, error: "attachment_type" };
    if (file.size > MAX_BILLING_IMAGE_BYTES) return { ok: false, error: "attachment_size" };
    images.push({
      filename: file.name || `billing-image-${images.length + 1}`,
      content: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || "application/octet-stream",
    });
  }
  return { ok: true, images };
}
