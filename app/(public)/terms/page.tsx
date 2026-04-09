import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | File Right Assistant",
  description: "Terms and conditions for using File Right Assistant services.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800 px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">

        <h1 className="text-2xl font-semibold text-gray-900">
          Terms and Conditions
        </h1>

        <p className="text-gray-500 text-xs">
        </p>

        <p>
          1. File Right Assistant is a tax assistance platform operated by File Right Form Handling DOCUMENT FACILITATION SERVICES (DTI Registered, Philippines). By using this service, you agree to these terms.
        </p>

        <p>
          2. The service provides assistance in reviewing and preparing amendments for BIR Form 1701A. It does not guarantee approval, tax reduction, or any specific outcome, as final decisions are made by the Bureau of Internal Revenue (BIR).
        </p>

        <p>
          3. This platform is intended for Job Order (JO) and Contract of Service (COS) professionals only. Business income cases and unsupported tax scenarios are not currently processed.
        </p>

        <p>
          4. A free evaluation is conducted before any paid service. Users are informed whether optimization is possible before proceeding.
        </p>

        <p>
          5. Fees are based on performance: 25% of the tax savings plus a ₱1,000 processing fee. Payment is required only after confirmation of service.
        </p>

        <p>
          6. Users agree to provide accurate and complete information. The platform is not responsible for incorrect results arising from false or incomplete data.
        </p>

        <p>
          7. All information provided is handled securely and used solely for tax evaluation and processing. Data is not sold or shared without consent.
        </p>

        <p>
          8. Payments made for completed services are non-refundable, unless there is a clear failure in service delivery.
        </p>

        <p>
          9. The platform is not liable for penalties, losses, or damages resulting from user-provided data, third-party systems, or government decisions. Liability is limited to the amount paid for the service.
        </p>

        <p>
          10. The service may be updated or modified at any time to improve functionality or compliance.
        </p>

        <p>
          11. Access may be suspended if the service is misused or if false information is submitted.
        </p>

        <p>
          12. These terms are governed by the laws of the Republic of the Philippines.
        </p>

        <p>
          13. By continuing to use this platform, you confirm that you understand and agree to these terms.
        </p>

      </div>
    </main>
  );
}