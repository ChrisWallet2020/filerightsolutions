import { redirect } from "next/navigation";
import { isProcessor2Authed } from "@/lib/auth";
import { getFilingCompleteNotifyClientRows } from "@/lib/admin/filingCompleteNotifyClients";
import { FilingCompleteEmailForm } from "@/components/admin/FilingCompleteEmailForm";
import { getProcessor2Credentials } from "@/lib/siteSettings";

export const dynamic = "force-dynamic";

export default async function Processor2FilingCompleteEmailPage() {
  const creds = await getProcessor2Credentials();
  if (!isProcessor2Authed(creds.username)) redirect("/processor2_dashboard/login");
  const clients = await getFilingCompleteNotifyClientRows();
  return (
    <section className="section">
      <h1>Filing confirmation email</h1>
      <p className="muted adminPageIntro">
        Send the standard “filing processed” notice to a client who has <b>paid</b> and <b>submitted</b> a 1701A
        evaluation. Preview the HTML version, then send when ready (sign-in email is used for delivery).
      </p>
      <FilingCompleteEmailForm clients={clients} />
    </section>
  );
}
