import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | File Right Assistant",
  description: "Privacy policy for File Right Assistant services.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800 px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
        <h1 className="text-2xl font-semibold text-gray-900">Privacy Policy</h1>

        <p>
          File Right Assistant is operated by File Right Form Handling Document Facilitation Services (DTI Registered,
          Philippines). This Privacy Policy explains how we collect, use, and protect your personal information when
          you use our services.
        </p>

        <h2 className="text-lg font-semibold text-gray-900">Information We Collect</h2>
        <p>We may collect the following information:</p>
        <p>- Full name, email address, mobile number, and account credentials</p>
        <p>- Tax-related details and supporting files you voluntarily submit</p>
        <p>- Transaction records, service package details, and payment status</p>
        <p>- Technical information needed for platform security and operations</p>

        <h2 className="text-lg font-semibold text-gray-900">How We Use Your Information</h2>
        <p>We use your information to:</p>
        <p>- Provide tax assistance services and related client support</p>
        <p>- Process orders, payments, and service delivery workflows</p>
        <p>- Communicate service updates, account notices, and required follow-ups</p>
        <p>- Improve platform quality, reliability, and compliance controls</p>

        <h2 className="text-lg font-semibold text-gray-900">Annual Tax Reminder Emails</h2>
        <p>
          We may use your contact details, including your email address, to send yearly reminders related to tax filing
          deadlines and relevant service updates for the next filing season.
        </p>
        <p>
          You may opt out of non-essential reminder emails at any time by following the unsubscribe instructions in the
          email or by contacting our support team.
        </p>

        <h2 className="text-lg font-semibold text-gray-900">Data Sharing</h2>
        <p>
          We do not sell your personal data. We only share information when needed to operate our services (for example,
          payment processing or hosting providers), when required by law, or when you give consent.
        </p>

        <h2 className="text-lg font-semibold text-gray-900">Data Protection and Retention</h2>
        <p>
          We apply reasonable administrative, technical, and organizational safeguards to protect your information
          against unauthorized access, alteration, disclosure, or loss.
        </p>
        <p>
          We retain personal data only for as long as needed for service delivery, legal obligations, dispute resolution,
          and legitimate business purposes.
        </p>

        <h2 className="text-lg font-semibold text-gray-900">Your Rights</h2>
        <p>
          Subject to applicable laws, you may request access to, correction of, or deletion of your personal information,
          and you may raise concerns regarding data processing practices.
        </p>

        <h2 className="text-lg font-semibold text-gray-900">Policy Updates</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect operational, legal, or regulatory changes.
          Updates become effective once posted on this page.
        </p>

        <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
        <p>
          For privacy-related concerns or requests, please contact our support team through the contact details provided
          on our website.
        </p>
      </div>
    </main>
  );
}