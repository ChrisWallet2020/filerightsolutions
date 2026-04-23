import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `Terms and conditions for using ${config.brandName} and ${config.siteName}.`,
};

export default function TermsPage() {
  const support = config.supportEmail;
  const brand = config.brandName;
  const site = config.siteName;

  return (
    <main className="publicPage policyPage">
      <div className="max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
        <h1 className="text-2xl font-semibold text-gray-900">Terms and Conditions</h1>

        <p className="text-gray-500 text-xs">
          Last updated: April 19, 2026. Please read these terms carefully before using our website or services.
        </p>

        <p>
          These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of the website and services
          offered by {brand} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) through {site} (the &quot;Platform&quot;).
          By accessing the Platform, creating an account, or using our services, you agree to be bound by these Terms.
          If you do not agree, do not use the Platform.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">1. Operator</h2>
        <p>
          The Platform is operated in connection with File Right Form Handling Document Facilitation Services
          (DTI-registered business, Philippines). For service and legal notices, contact us at{" "}
          <a className="text-blue-700 underline" href={`mailto:${support}`}>
            {support}
          </a>
          .
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">2. Nature of the service</h2>
        <p>
          We provide administrative and preparatory assistance relating to Philippine annual income tax filings, including
          review and amendment support for BIR Form 1701A, based on information you supply. We may offer evaluations,
          document preparation support, communications, and related workflows through the Platform.
        </p>
        <p>
          We are not the Bureau of Internal Revenue (&quot;BIR&quot;), not a government agency, and not providing legal,
          accounting, or audit representation unless separately agreed in writing. Nothing on the Platform is a promise of
          any particular tax outcome, assessment, or BIR decision.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">3. Eligibility and scope</h2>
        <p>
          The Platform is intended primarily for Job Order (JO) and Contract of Service (COS) professionals and similar
          individual income scenarios we explicitly accept. We do not warrant that we can assist with business income
          structures, unsupported tax positions, or matters outside the scope we communicate during evaluation or
          onboarding.
        </p>
        <p>
          You represent that you have authority to submit information for yourself (or, where applicable, for the taxpayer
          you identify) and that your use of the Platform complies with applicable laws and employer or contract
          obligations.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">4. Evaluations, quotes, and engagement</h2>
        <p>
          We may offer a free or preliminary evaluation before paid work. An evaluation does not obligate you to purchase
          services and does not obligate us to accept every matter. Where we issue a quoted fee or payment request, that
          quote is based on the information available at the time and the service description provided on the Platform or in
          writing.
        </p>
        <p>
          If we determine that no lawful optimization or correction is appropriate, we will communicate that and, where
          stated on the Platform, no service fee may apply for that outcome. Any promotional or referral credit rules shown
          on the Platform or at checkout apply only as expressly stated there.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">5. Fees and payment</h2>
        <p>
          Service fees are stated in Philippine pesos (PHP) unless otherwise specified. Unless we say otherwise, quoted
          billing for eligible 1701A assistance is generally structured as a minimum processing component (currently PHP
          1,000) plus a variable component tied to demonstrated overpayment or similar measurable difference derived from
          your submitted return data and our methodology—see your quote, checkout, or invoice for the exact amount that
          applies to you.
        </p>
        <p>
          Taxes, bank fees, or payment-processor charges may apply in addition where required by law or your financial
          institution. You authorize us and our payment partners to charge the payment method you provide according to the
          authorization you give at checkout or in the Platform.
        </p>
        <p>
          Refunds are strictly limited. Except where applicable law requires otherwise, all fees are non-refundable. The
          only circumstance in which we will consider refunding service fees you paid is set out in our{" "}
          <Link className="text-blue-700 underline" href="/refund-policy">
            Refund Policy
          </Link>
          , which forms part of these Terms. By paying through the Platform, you acknowledge that policy.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">6. Your responsibilities</h2>
        <p>You agree to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide information that is truthful, complete, and not misleading;</li>
          <li>Upload only documents you are entitled to share and that are free of malware;</li>
          <li>Maintain the confidentiality of your account credentials and notify us of suspected unauthorized access;</li>
          <li>Cooperate with reasonable requests for clarification, signatures, or supporting documents;</li>
          <li>Not use the Platform for fraud, harassment, scraping, reverse engineering where prohibited, or unlawful
            purposes.
          </li>
        </ul>
        <p>
          You remain responsible for reviewing any filing or submission prepared with our assistance before it is filed with
          the BIR or other authorities, unless you have expressly delegated that step in a manner permitted by law and we
          have agreed in writing.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">7. No unlawful conduct</h2>
        <p>
          You must not request or expect us to fabricate expenses, conceal income, or prepare positions that are false or
          contrary to law. We may refuse or discontinue services if we reasonably believe a request is improper or
          non-compliant.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">8. Intellectual property</h2>
        <p>
          The Platform, its design, text, graphics, logos, and underlying software are owned by us or our licensors and are
          protected by intellectual property laws. We grant you a limited, revocable, non-exclusive license to access and use
          the Platform for personal, non-commercial use in connection with services you obtain from us. You may not copy,
          modify, distribute, or create derivative works except as allowed by law or with our prior written consent.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">9. Third-party services</h2>
        <p>
          We may rely on hosting providers, email delivery, analytics, payment gateways, and other vendors. Their terms and
          privacy practices may also apply to you when you use their features (for example, when you complete a card or
          wallet payment). We are not responsible for outages or acts of third parties beyond our reasonable control.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">10. Privacy and refund policy</h2>
        <p>
          Our collection and use of personal data is described in our{" "}
          <Link className="text-blue-700 underline" href="/privacy-policy">
            Privacy Policy
          </Link>
          . Refunds are described exclusively in our{" "}
          <Link className="text-blue-700 underline" href="/refund-policy">
            Refund Policy
          </Link>
          . By using the Platform, you acknowledge both policies.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">11. Disclaimers</h2>
        <p>
          THE PLATFORM AND SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM EXTENT
          PERMITTED BY APPLICABLE LAW, WE DISCLAIM ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED
          WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT
          UNINTERRUPTED OR ERROR-FREE OPERATION.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">12. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, NEITHER {brand} NOR ITS OPERATORS, OFFICERS, EMPLOYEES, OR
          CONTRACTORS WILL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF
          PROFITS, DATA, OR GOODWILL, ARISING FROM OR RELATED TO THESE TERMS OR THE SERVICES, EVEN IF ADVISED OF THE
          POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p>
          OUR AGGREGATE LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATED TO SERVICES YOU PURCHASED IN THE TWELVE (12)
          MONTHS BEFORE THE CLAIM IS LIMITED TO THE AMOUNT YOU PAID US FOR THOSE SERVICES, EXCEPT WHERE LIABILITY CANNOT BE
          LIMITED UNDER APPLICABLE LAW (FOR EXAMPLE, GROSS NEGLIGENCE OR WILLFUL MISCONDUCT TO THE EXTENT RECOGNIZED BY A
          COMPETENT COURT).
        </p>
        <p>
          We are not liable for penalties, interest, reassessments, or enforcement actions by the BIR or other agencies that
          result from inaccurate information you supplied, late filing, or changes in law or BIR practice after we assist
          you.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">13. Indemnity</h2>
        <p>
          You agree to indemnify and hold harmless {brand}, its operator, and their personnel from claims, damages, losses,
          liabilities, and expenses (including reasonable attorneys&apos; fees) arising from your breach of these Terms,
          your misuse of the Platform, or your violation of law or third-party rights—except to the extent caused by our
          willful misconduct.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">14. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. We will post the revised version on this page and update the
          &quot;Last updated&quot; date. Material changes may also be communicated through the Platform or by email where
          appropriate. Continued use after the effective date constitutes acceptance of the revised Terms.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">15. Suspension and termination</h2>
        <p>
          We may suspend or terminate access to the Platform or refuse service if you breach these Terms, create risk or
          legal exposure, or if we discontinue all or part of the Platform. You may stop using the Platform at any time.
          Provisions that by their nature should survive (including limitations of liability, indemnity, and governing law)
          will survive termination.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">16. Governing law and disputes</h2>
        <p>
          These Terms are governed by the laws of the Republic of the Philippines, without regard to conflict-of-law rules.
          Subject to mandatory consumer protections, you agree that the courts of the Philippines shall have exclusive
          jurisdiction over disputes arising from these Terms or the services, unless we elect another forum permitted by
          law.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">17. Severability</h2>
        <p>
          If any provision of these Terms is held invalid or unenforceable, the remaining provisions remain in full force
          and effect.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">18. Contact</h2>
        <p>
          Questions about these Terms:{" "}
          <a className="text-blue-700 underline" href={`mailto:${support}`}>
            {support}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
