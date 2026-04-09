import { Card } from "@/components/ui/Card";

export function TrustStrip() {
  return (
    <section className="trustStrip">
      <Card title="Secure Document Handling" desc="Private uploads with restricted access." />
      <Card title="Fixed Service Fees" desc="Clear packages and invoice-based checkout." />
      <Card title="Compliance-Focused Process" desc="Guidance aligned with applicable BIR rules." />
    </section>
  );
}