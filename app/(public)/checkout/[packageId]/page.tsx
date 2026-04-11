import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default async function CheckoutPage({ params }: { params: { packageId: string } }) {
  const pkg = await prisma.servicePackage.findUnique({ where: { id: params.packageId } });
  if (!pkg) return <div className="section">Package not found.</div>;

  return (
    <section className="section">
      <h1>Checkout – Tax Filing Assistance Service</h1>
      <p className="muted">Please review the details below before proceeding to payment.</p>

      <div className="checkoutGrid">
        <div className="checkoutBox">
          <h2>Invoice Details</h2>
          <div className="kv"><span>Service Selected</span><span>{pkg.name}</span></div>
          <div className="kv"><span>Client Type</span><span>Job Order / Contract of Service</span></div>
          <div className="kv"><span>Service Fee</span><span><strong>₱{pkg.pricePhp.toLocaleString()}</strong></span></div>
          <p className="muted">This invoice will be generated after you enter your details.</p>

          <h3>What’s Included</h3>
          <ul className="muted">
            <li>Review of provided tax documents</li>
            <li>Computation of applicable tax obligations</li>
            <li>Evaluation of legally available deductions (if eligible)</li>
            <li>Preparation assistance and filing guidance</li>
          </ul>

          <div className="notice">
            <strong>Important Notice</strong>
            <p>
              This payment is for <strong>professional service fees only</strong>. It does not include government taxes,
              penalties, or filing fees. We do not collect or remit taxes on your behalf. We are not the BIR.
            </p>
          </div>

          <p className="muted">
            Tax outcomes depend on individual circumstances and submitted information. We do not guarantee reductions,
            approvals, or specific outcomes.
          </p>

          <div className="policyLinks">
            <Link className="link" href="/terms">Terms & Conditions</Link>
            <Link className="link" href="/refund-policy">Refund Policy</Link>
            <Link className="link" href="/privacy-policy">Privacy Policy</Link>
          </div>
        </div>

        <div className="checkoutBox">
          <h2>Your Details</h2>

          <form method="post" action="/api/checkout/create-order" className="form">
            <input type="hidden" name="packageId" value={pkg.id} />

            <label>
              Full Name
              <input name="customerName" required placeholder="Juan Dela Cruz" />
            </label>

            <label>
              Email
              <input name="customerEmail" type="email" required placeholder={`you@example.com`} />
            </label>

            <label>
              Mobile Number (optional)
              <input name="customerPhone" placeholder="09xxxxxxxxx" />
            </label>

            <label className="checkboxRow">
              <input type="checkbox" name="ack" required />
              <span>
                I confirm that I have reviewed the service details and understand that this payment is for professional service
                fees only, subject to the Terms, Refund Policy, and Privacy Policy.
              </span>
            </label>

            <div className="muted">
              Secure checkout is powered by PayMongo. Complete payment by scanning QR Ph code with GCash, Maya,
              ShopeePay or Online Banking Apps.
            </div>

            <Button type="submit" className="wFull">Proceed to Secure Payment</Button>

            <div className="muted small">
              You will be redirected to PayMongo to complete your payment. For support: {config.supportEmail}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}