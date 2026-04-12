import { config } from "../config";
import { joinTextParagraphs, emailSignatureText } from "./formatting";

export type EmailVars = {
  clientName: string;
  orderId: string;
  serviceName: string;
  amountPhp: number;
  uploadLink: string;
  businessName?: string;
  yourName?: string;
};

export function uploadRequestEmail(v: EmailVars) {
  const subject = `Action Required: Upload Your Tax Documents – Order ${v.orderId}`;
  const signer = v.yourName || "Reiner";
  const org = v.businessName || config.siteName;
  const body = joinTextParagraphs([
    `Hello ${v.clientName},`,
    `To proceed with your selected service, please upload the required tax documents for Order ${v.orderId}.`,
    `Secure upload link:\n${v.uploadLink}`,
    `Commonly required documents (as applicable):
• Proof of income / payment summaries
• BIR Form 2307 (if applicable)
• Previous tax filings (if available)
• Valid government-issued ID`,
    `All documents are uploaded through a secure portal and are accessible only to authorized personnel.`,
    `Important reminders:
• Please ensure all information is complete and accurate.
• Incomplete submissions may delay processing.
• Tax outcomes depend on individual circumstances and eligibility under current BIR rules.`,
    `If you are unsure which documents apply to your case, reply to this email for clarification.`,
    `${emailSignatureText(signer)}\n${org}\n${config.supportEmail}`,
  ]);
  return { subject, body };
}

export function completionEmail(v: EmailVars) {
  const subject = `Service Completed – Order ${v.orderId}`;
  const signer = v.yourName || "Reiner";
  const org = v.businessName || config.siteName;
  const body = joinTextParagraphs([
    `Hello ${v.clientName},`,
    `We are writing to inform you that your tax filing assistance service for Order ${v.orderId} has been completed.`,
    `Summary of work completed:
• Review of submitted documents
• Computation and evaluation of applicable tax obligations
• Assessment of legally available deductions (if eligible)
• Preparation of filing outputs and guidance`,
    `Next steps:
Please review the outputs and instructions provided. You remain responsible for the final filing and submission of your tax return and any payment due to the Bureau of Internal Revenue (BIR).`,
    `Data retention notice:
Your documents will be retained only as necessary to comply with operational and legal requirements. If you wish to request deletion after completion, contact ${config.supportEmail}.`,
    `Respectfully,\n${signer}\n${org}`,
  ]);
  return { subject, body };
}
