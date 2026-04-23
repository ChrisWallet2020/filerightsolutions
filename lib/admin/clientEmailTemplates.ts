import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { clientEmailBranding } from "@/lib/email/clientEmailBranding";
import { billingEmailFooterHtml, textToEmailHtmlParagraphs, wrapEmailMainHtml } from "@/lib/email/formatting";

export type TemplateKind =
  | "PASSWORD_RESET"
  | "REGISTER_WELCOME"
  | "BILLING_QUOTE"
  | "FILING_COMPLETE_NOTIFY"
  | "PAYMENT_RECEIVED_IN_PROGRESS"
  | "EVALUATION_NO_REDUCTION_UPDATE"
  | "EVALUATION_PAYMENT_FOLLOWUP"
  | "BIR_1701A_DEADLINE_REMINDER";

type RenderedTemplate = {
  subject: string;
  textBody: string;
  htmlBody: string;
};

export type ClientEmailTemplateDef = {
  kind: TemplateKind;
  title: string;
  subject: string;
  textBody: string;
};

export type ClientEmailTemplatePreview = {
  subject: string;
  textBody: string;
  htmlBody: string;
};

const TEMPLATE_DEFS: Record<TemplateKind, ClientEmailTemplateDef> = {
  PASSWORD_RESET: {
    kind: "PASSWORD_RESET",
    title: "Password reset",
    subject: "Reset your password",
    textBody: [
      "We received a request to reset your password.",
      "Reset link: {{resetUrl}}",
      "If you did not request this, you can ignore this email.",
      "Need help? Contact {{supportEmail}}.",
    ].join("\n\n"),
  },
  REGISTER_WELCOME: {
    kind: "REGISTER_WELCOME",
    title: "Register welcome",
    subject: "Welcome to {{siteName}}",
    textBody: [
      "Hi {{fullName}},",
      "Your {{siteName}} account is ready.",
      "Sign in here: {{loginUrl}}",
      "For support, contact {{supportEmail}}.",
    ].join("\n\n"),
  },
  BILLING_QUOTE: {
    kind: "BILLING_QUOTE",
    title: "Billing quote",
    subject: "BIR Tax Evaluation Results",
    textBody: [
      "Hello {{clientFullName}},",
      "Your billing quote is ready.",
      "Payment link: {{payUrl}}",
      "Note: {{clientNote}}",
      "Valid until: {{expiresDate}}",
    ].join("\n\n"),
  },
  FILING_COMPLETE_NOTIFY: {
    kind: "FILING_COMPLETE_NOTIFY",
    title: "Filing complete notify",
    subject: "Your filing has been processed",
    textBody: [
      "Hi {{firstName}},",
      "Your filing has been processed successfully.",
      "You may use BIR ePay here: {{epayUrl}}",
      "For questions, contact {{supportEmail}}.",
    ].join("\n\n"),
  },
  PAYMENT_RECEIVED_IN_PROGRESS: {
    kind: "PAYMENT_RECEIVED_IN_PROGRESS",
    title: "Payment received in progress",
    subject: "Payment Received - Tax Filing in Progress",
    textBody: [
      "Hi {{clientName}},",
      "We received your payment (reference: {{publicOrderId}}).",
      "Your tax filing is now in progress.",
    ].join("\n\n"),
  },
  EVALUATION_NO_REDUCTION_UPDATE: {
    kind: "EVALUATION_NO_REDUCTION_UPDATE",
    title: "No reduction update",
    subject: "Update on Your Tax Evaluation",
    textBody: [
      "Dear {{customerName}},",
      "After review, we found no meaningful tax reduction opportunity at this time.",
      "Thank you for considering our service.",
    ].join("\n\n"),
  },
  EVALUATION_PAYMENT_FOLLOWUP: {
    kind: "EVALUATION_PAYMENT_FOLLOWUP",
    title: "Evaluation payment follow-up",
    subject: "Your 1701A evaluation is received — payment link",
    textBody: [
      "Hello {{customerName}},",
      "Thank you — we have received your BIR Form 1701A evaluation.",
      "Payment link: {{paymentUrl}}",
    ].join("\n\n"),
  },
  BIR_1701A_DEADLINE_REMINDER: {
    kind: "BIR_1701A_DEADLINE_REMINDER",
    title: "BIR 1701A deadline reminder",
    subject: "Friendly Reminder: BIR Form 1701A Filing Deadline",
    textBody: [
      "Dear {{clientName}},",
      "The tax filing deadline is fast approaching.",
      "As a friendly reminder, late submission of your BIR Form 1701A may result in penalties imposed by the Bureau of Internal Revenue. These typically include a compromise penalty (₱1,000–₱5,000), a 25% surcharge, and 12% annual interest if there is a balance due.",
      "To give you a clearer picture, here is a simple example for a ₱10,000 tax due filed late:",
      "25% surcharge: ₱2,500\nCompromise penalty: ₱1,000–₱5,000\nInterest (12% annually): ₱1,200 per year (pro-rated depending on delay)",
      "Total additional cost is ₱4,700 to ₱8,700+ on top of your original tax due.",
      "We normally receive a high volume of client requests as the filing period nears. As a result, availability becomes limited and we may not be able to accommodate all submissions in time.",
      "Please note that we do not process late filings, as penalty computations often require detailed manual assessment and direct handling by a tax professional.",
      "To avoid unnecessary penalties and ensure your filing is completed properly, we strongly encourage you to proceed while slots are still available.",
      "We remain ready to assist you-while capacity permits.",
      "Best regards, Reiner",
    ].join("\n\n"),
  },
};

function wrap(textBody: string) {
  return wrapEmailMainHtml(
    `${textToEmailHtmlParagraphs(textBody)}${billingEmailFooterHtml()}`,
    clientEmailBranding(),
  );
}

function keyFor(kind: TemplateKind) {
  return `email_template_${kind.toLowerCase()}`;
}

function fill(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_m, key) => {
    const v = data[key];
    if (v === null || v === undefined) return "";
    return String(v);
  });
}

function sampleDataForKind(kind: TemplateKind): Record<string, unknown> {
  switch (kind) {
    case "PASSWORD_RESET":
      return { resetUrl: `${String(config.baseUrl).replace(/\/$/, "")}/reset-password?token=sample-token` };
    case "REGISTER_WELCOME":
      return {
        fullName: "Christopher",
        loginUrl: `${String(config.baseUrl).replace(/\/$/, "")}/login`,
      };
    case "BILLING_QUOTE":
      return {
        clientFullName: "Christopher",
        payUrl: `${String(config.baseUrl).replace(/\/$/, "")}/account/payment/notice?t=preview`,
        clientNote: "Please settle on or before due date.",
        expiresDate: "December 31, 2026",
      };
    case "FILING_COMPLETE_NOTIFY":
      return {
        firstName: "Christopher",
        epayUrl: "https://www.bir.gov.ph/ePay",
      };
    case "PAYMENT_RECEIVED_IN_PROGRESS":
      return {
        clientName: "Christopher",
        publicOrderId: "ORD-123456",
      };
    case "EVALUATION_NO_REDUCTION_UPDATE":
      return { customerName: "Christopher" };
    case "EVALUATION_PAYMENT_FOLLOWUP":
      return {
        customerName: "Christopher",
        paymentUrl: `${String(config.baseUrl).replace(/\/$/, "")}/account/payment`,
      };
    case "BIR_1701A_DEADLINE_REMINDER":
      return {
        clientName: "Christopher",
      };
  }
}

async function getOverridesMap(): Promise<Map<string, { subject: string; textBody: string }>> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { startsWith: "email_template_" } },
    select: { key: true, value: true },
  });
  const map = new Map<string, { subject: string; textBody: string }>();
  for (const r of rows) {
    try {
      const parsed = JSON.parse(r.value) as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof (parsed as Record<string, unknown>).subject === "string" &&
        typeof (parsed as Record<string, unknown>).textBody === "string"
      ) {
        map.set(r.key, {
          subject: String((parsed as Record<string, unknown>).subject),
          textBody: String((parsed as Record<string, unknown>).textBody),
        });
      }
    } catch {
      // ignore invalid rows
    }
  }
  return map;
}

export async function listClientEmailTemplates(): Promise<ClientEmailTemplateDef[]> {
  const overrides = await getOverridesMap();
  const out: ClientEmailTemplateDef[] = [];
  for (const kind of Object.keys(TEMPLATE_DEFS) as TemplateKind[]) {
    const def = TEMPLATE_DEFS[kind];
    const ov = overrides.get(keyFor(kind));
    out.push({
      ...def,
      subject: ov?.subject ?? def.subject,
      textBody: ov?.textBody ?? def.textBody,
    });
  }
  return out;
}

export async function saveClientEmailTemplate(
  kind: TemplateKind,
  payload: { subject: string; textBody: string },
): Promise<void> {
  const key = keyFor(kind);
  await prisma.siteSetting.upsert({
    where: { key },
    create: {
      key,
      value: JSON.stringify({
        subject: payload.subject.trim(),
        textBody: payload.textBody.trim(),
      }),
    },
    update: {
      value: JSON.stringify({
        subject: payload.subject.trim(),
        textBody: payload.textBody.trim(),
      }),
    },
  });
}

export async function renderClientEmailTemplate(
  kind: TemplateKind,
  data: Record<string, unknown>,
): Promise<RenderedTemplate> {
  const overrides = await getOverridesMap();
  const base = TEMPLATE_DEFS[kind];
  const ov = overrides.get(keyFor(kind));
  const mergedData: Record<string, unknown> = {
    siteName: config.siteName,
    supportEmail: config.supportEmail,
    baseUrl: config.baseUrl,
    ...data,
  };
  const subjectTpl = ov?.subject ?? base.subject;
  const textTpl = ov?.textBody ?? base.textBody;
  const subject = fill(subjectTpl, mergedData).trim() || base.subject;
  const textBody = fill(textTpl, mergedData).trim() || textTpl;
  return {
    subject,
    textBody,
    htmlBody: wrap(textBody),
  };
}

export async function renderClientEmailTemplatePreview(
  kind: TemplateKind,
  payload: { subject: string; textBody: string },
): Promise<ClientEmailTemplatePreview> {
  const mergedData: Record<string, unknown> = {
    siteName: config.siteName,
    supportEmail: config.supportEmail,
    baseUrl: config.baseUrl,
    ...sampleDataForKind(kind),
  };
  const subject = fill(payload.subject, mergedData).trim();
  const textBody = fill(payload.textBody, mergedData).trim();
  return {
    subject,
    textBody,
    htmlBody: wrap(textBody),
  };
}
