export const metadata = {
  title: "How It Works",
  description:
    "Step-by-step BIR Form 1701A review: account, submission, recomputation, analysis, and amendment support.",
};

export default function HowItWorksPage() {
  return (
    <main className="publicPage">
      <h1>How It Works</h1>

      <p className="publicLead">
        Our process is structured, transparent, and aligned with current BIR regulations. Every step is carefully
        reviewed, recalculated, and corrected to ensure accurate tax computation.
      </p>

      <ol className="publicList">
        <li>
          <b>Create an account for secure processing</b>
          <div className="publicListDetail">
            Registration ensures secure document handling, structured tracking, and eligibility for referral benefits.
          </div>
        </li>

        <li>
          <b>Submit your filed 1701A and income details</b>
          <div className="publicListDetail">
            We carefully review your previously filed return and the income information declared for the tax year.
          </div>
        </li>

        <li>
          <b>Structured recomputation under current BIR rules</b>
          <div className="publicListDetail">
            Your tax return is carefully recalculated based strictly on applicable tax regulations to ensure accuracy
            and determine whether your tax can be legally reduced.
          </div>
        </li>

        <li>
          <b>Receive a clear, side-by-side analysis</b>
          <div className="publicListDetail">
            We present the original computation versus the corrected figures so you can clearly see the difference.
          </div>
        </li>

        <li>
          <b>If correction is justified, we assist with amended preparation</b>
          <div className="publicListDetail">
            We prepare your amended BIR Form 1701A and handle the proper tax filing for you.
          </div>
        </li>
      </ol>

      <section className="publicImportant" aria-labelledby="howitworks-important-heading">
        <h2 id="howitworks-important-heading">Important</h2>
        <p>
          We do not fabricate expenses or manipulate declarations. Our service focuses on lawful recomputation and
          correction within existing BIR rules, supported by proper documentation.
        </p>
      </section>
    </main>
  );
}
