import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function CTASection() {
  return (
    <section className="cta">
      <h2>Evaluate Your Tax Filing for Eligible Legal Reductions</h2>
      <p className="muted">
        Have your JO/COS tax filing reviewed to determine legally available deductions and proper filing options.
      </p>
      <Link href="/pricing">
        <Button>Get Started</Button>
      </Link>
    </section>
  );
}