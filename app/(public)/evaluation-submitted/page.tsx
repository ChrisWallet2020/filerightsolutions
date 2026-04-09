// app/(public)/evaluation-submitted/page.tsx

export default function EvaluationSubmittedPage() {
  return (
    <main className="publicPage">
      <section className="publicImportant" aria-labelledby="evaluation-submitted-heading">
        <h2 id="evaluation-submitted-heading">Thank You — Your Evaluation Has Been Submitted</h2>
        <p>We&apos;ve successfully received your BIR Form 1701A evaluation.</p>
        <p>
          Our team will carefully review your submission and assess whether any corrections or tax optimizations can be
          applied. This process typically takes 1–2 business days.
        </p>
        <p>Thank you for trusting us to assist with your tax filing.</p>
      </section>
    </main>
  );
}
