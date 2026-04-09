export const metadata = {
  title: "Pricing",
  description:
    "Structured pricing for BIR Form 1701A review: 25% of verified tax reduction plus a fixed processing fee, and referral program credits.",
};

export default function PricingPage() {
  return (
    <main className="publicPage">
      <h1>Structured Pricing</h1>

      <p className="publicLead">
        For BIR Form <b>1701A</b> review and amended filing assistance, our fees are based on the verified tax
        difference identified after lawful recomputation — plus a fixed processing charge.
      </p>

      <section className="publicPageSection">
        <h2 className="publicSectionTitle">1701A Amendment Assistance</h2>

        <ul className="publicList">
          <li>
            <b>25% of verified tax reduction</b>
          </li>
          <li>
            <b>+ ₱1,000 fixed processing fee</b>
          </li>
        </ul>

        <p className="publicText" style={{ marginTop: 12 }}>
          The 25% applies only to the actual tax reduction achieved through proper application of current BIR
          regulations.
        </p>

        <p className="publicText" style={{ marginTop: 6 }}>
          If no tax difference is identified after structured review, no percentage-based fee is charged.
        </p>
      </section>

      <section className="publicPageSectionLoose">
        <h2 className="publicSectionTitle">Example Computation</h2>

        <p className="publicText" style={{ lineHeight: 1.8 }}>
          If your originally filed income tax was <b>₱10,000</b>, and after lawful recomputation it is reduced to{" "}
          <b>₱0</b>:
        </p>

        <div className="publicInsetBox">
          Tax Reduction: ₱10,000
          <br />
          25% of ₱10,000: ₱2,500
          <br />
          Processing Fee: ₱1,000
          <br />
          <b>Total Service Fee: ₱3,500</b>
        </div>

        <p className="publicText" style={{ marginTop: 12 }}>
          Fees are computed only on verified tax differences supported by documentation.
        </p>
      </section>

      <section className="publicPageSectionLoose">
        <h2 className="publicSectionTitle">Referral Program</h2>

        <p className="publicText">
          Once you register, you will automatically receive your own unique referral link.
        </p>

        <p className="publicText">
          You may share this link with other Job Order (JO) or Contract of Service (COS) professionals. Each distinct
          user who completes the free 1701A evaluation using your link earns you <b>one (1) referral credit</b>, worth
          a <b>10% reduction</b> on applicable service fees.
        </p>

        <p className="publicText">
          Only one referral credit can be redeemed per user. Credit is granted when the referred user completes the
          evaluation, regardless of whether they proceed with paid assistance.
        </p>
      </section>
    </main>
  );
}
