export default function SubmittedPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold text-neutral-500">SUBMITTED</div>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">We received your Form 1701A.</h1>
        <p className="mt-3 text-sm text-neutral-700">
          We will evaluate your Form 1701A within <span className="font-semibold">1–2 business days</span>.
          If we need clarifications, we’ll contact you using the email/number you provided.
        </p>

        <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          Tip: Keep your filed Form 1701A ready in case we request a quick screenshot for verification.
        </div>
      </div>
    </div>
  );
}