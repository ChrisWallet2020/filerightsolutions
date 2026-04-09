export const metadata = {
  title: "FAQs",
  description:
    "Answers about BIR Form 1701A review, free evaluation, fees, legality, timeline, and support for JO, COS, and government-paid professionals.",
};

const qa = [
  {
    q: "What does your service do?",
    a: "We help review and amend BIR Form 1701A filings for professionals, government-paid professionals, and contract-based workers. Our goal is to ensure your taxes are accurate, compliant, and not higher than necessary.",
  },
  {
    q: "Who is this service for?",
    a: "Our service is designed for Job Order (JO), Contract of Service (COS), and government-paid professionals with relatively simple tax structures. If your case involves complex business income, we may not be able to process it at this time.",
  },
  {
    q: "How does the process work?",
    a: "You start by completing a free evaluation form based on your previously filed return. We review your data, determine if corrections or optimizations are possible, and then guide you through the amendment process if you choose to proceed.",
  },
  {
    q: "Do I have to pay upfront?",
    a: "No. The evaluation is completely free, and you only pay if we successfully reduce your tax.",
  },
  {
    q: "How much do you charge?",
    a: "Our fee is 25% of the tax savings plus a ₱1,000 processing fee. If there are no savings, you won&apos;t be charged the percentage fee.",
  },
  {
    q: "Is this legal?",
    a: "Yes. All adjustments and optimizations are based on allowable methods under Philippine tax laws. We do not use any illegal or risky strategies.",
  },
  {
    q: "How long does the process take?",
    a: "Initial evaluation typically takes 1–2 business days. The full amendment process may vary depending on your case and document completeness.",
  },
  {
    q: "Will you file the amendment for me?",
    a: "Yes. Once your amended BIR Form 1701A is finalized, we handle the filing for you so it is submitted correctly and in line with BIR requirements. We keep you informed and may need your confirmation or supporting details along the way.",
  },
  {
    q: "What if my taxes are already correct?",
    a: "If your filing is already accurate and no optimization is possible, we will inform you. In such cases, no service fee will be charged.",
  },
];

export default function FAQsPage() {
  return (
    <main className="publicPage">
      <h1>Frequently Asked Questions</h1>

      <p className="publicLead">
        We&apos;ve compiled answers to the most common questions to help you better understand how our service works
        and what to expect.
      </p>

      {qa.map(({ q, a }) => (
        <section key={q} className="publicFaqItem">
          <h2 className="publicFaqQ">{q}</h2>
          <p className="publicText">{a}</p>
        </section>
      ))}

      <section className="publicFaqItem">
        <h2 className="publicFaqQ">How do I contact support?</h2>
        <p className="publicText">
          You can reach us anytime at{" "}
          <a href="mailto:support@filerightsolutions.com" className="link">
            support@filerightsolutions.com
          </a>
          , and our team will assist you as soon as possible.
        </p>
      </section>
    </main>
  );
}
