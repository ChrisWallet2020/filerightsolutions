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

function peso(n: number) {
  return `₱${(n / 100).toFixed(2)}`.replace(".00", "");
}

export function paymentReceivedEmail(v: EmailVars) {
  const subject = `Payment Received – Order ${v.orderId}`;
  const signer = v.yourName || "Reiner";
  const org = v.businessName || config.siteName;
  const body = joinTextParagraphs([
    `Hello ${v.clientName},`,
    `Thank you for your payment.`,
    `We have successfully received your service fee for the following:`,
    `Order ID: ${v.orderId}
Service: ${v.serviceName}
Amount Paid: ${peso(v.amountPhp)}
Payment Method: PayMongo`,
    `This payment is for professional tax filing assistance services only. It does not include government taxes, penalties, or filing fees.`,
    `What happens next`,
    `To proceed with your tax filing review, please upload the required documents using the secure link below:`,
    `${v.uploadLink}`,
    `Once your documents are received, we will begin our review and computation based on applicable BIR rules and your submitted information.`,
    `If you have any questions, you may reply to this email or contact us at ${config.supportEmail}.`,
    `Kind regards,\n${signer}\n${org}`,
  ]);
  return { subject, body };
}

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
