import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: `Refund policy for ${config.brandName} and ${config.siteName}.`,
};

export default function RefundPolicyPage() {
  const support = config.supportEmail;
  const brand = config.brandName;

  return (
    <main className="min-h-screen bg-white text-gray-800 px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
        <h1 className="text-2xl font-semibold text-gray-900">Refund Policy</h1>

        <p className="text-gray-500 text-xs">
          Last updated: April 19, 2026. This Refund Policy is part of and must be read together with our{" "}
          <Link className="text-blue-700 underline" href="/terms">
            Terms &amp; Conditions
          </Link>
          .
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">1. General rule: no refunds</h2>
        <p>
          All fees paid to {brand} for evaluations, document assistance, filing support, or related services are final.
          There are no refunds for change of mind, dissatisfaction where the Bureau of Internal Revenue (BIR) assessment
          matches what we filed on your behalf, delays at the BIR, penalties or interest arising from your conduct or
          timing, or any reason not expressly listed in section 2 below.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">
          2. Sole exception: BIR documentation of a mismatch with our filing
        </h2>
        <p>
          The only situation in which you may request a refund of service fees is this: you can provide official BIR
          documentation (for example, an assessment notice, letter of authority excerpt, or other BIR-issued record that
          clearly states the tax due, assessment, or charge for the same taxpayer, taxable year, and return or amendment
          we assisted you with) that shows the amount the BIR charged or assessed for taxes is not the same as what we
          filed or prepared for you in our deliverable for that matter.
        </p>
        <p>
          Informal estimates, third-party spreadsheets, bank deductions alone, or documents that do not come from the BIR
          do not satisfy this requirement. We will not process a refund request without the BIR-issued documentation
          described above.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">3. How to request a refund under the exception</h2>
        <p>
          Send an email to {support} with subject line including &quot;Refund request&quot; and your full name, attach
          clear scans or PDFs of the complete BIR documentation, and briefly explain how it shows a mismatch between the
          BIR charge and what we filed for you. We may ask for additional BIR-issued pages or clarifications. We may
          verify authenticity and consistency with our records before deciding.
        </p>
        <p>
          You must submit the request within ninety (90) days from the date shown on the BIR document you rely on, or
          within ninety (90) days from the date you first could reasonably have obtained that document, whichever is
          earlier. Late requests are denied.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">4. Our decision</h2>
        <p>
          If, after review, we agree that your BIR documentation establishes that the BIR charged or assessed taxes in a
          amount that is not the same as what we filed for you for that same matter, we may, at our sole discretion, refund
          all or part of the service fee you paid for that specific engagement. If we do not agree that your
          documentation meets the strict test in section 2, the request is denied and no refund is owed.
        </p>
        <p>
          No refund is available for BIR adjustments based on information you did not disclose to us, for penalties or
          interest attributable to late filing or payment, or for differences that arise after you alter the return without
          our involvement.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">5. Chargebacks and payment disputes</h2>
        <p>
          Initiating a card or wallet chargeback or payment dispute instead of following this policy may result in closure
          of your account and recovery of fees and costs where permitted. We ask that you contact {support} first using the
          process in section 3.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">6. Contact</h2>
        <p>
          Refund questions:{" "}
          <a className="text-blue-700 underline" href={`mailto:${support}`}>
            {support}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
