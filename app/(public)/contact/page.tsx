export const metadata = {
  title: "Contact Us",
  description:
    "Reach File Right Solutions for questions, assistance, or follow-up on your BIR Form 1701A evaluation.",
};

export default function ContactPage() {
  return (
    <main className="publicPage">
      <h1>Contact Us</h1>

      <p className="publicText">
        If you have any questions, need assistance, or would like to follow up on your evaluation, our support team is
        here to help. We aim to respond promptly and provide clear, reliable guidance on any concerns related to your tax
        filing process.
      </p>

      <p className="publicText">
        You can reach us anytime at{" "}
        <a href="mailto:support@filerightsolutions.com" className="link">
          support@filerightsolutions.com
        </a>
        .
      </p>
    </main>
  );
}
