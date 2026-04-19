import { redirect } from "next/navigation";
import { getProcessor1Credentials } from "@/lib/siteSettings";
import { isProcessor1Authed } from "@/lib/auth";

export default async function Processor1IndexPage() {
  const creds = await getProcessor1Credentials();
  if (!isProcessor1Authed(creds.username)) {
    redirect("/processor1_dashboard/login");
  }
  redirect("/processor1_dashboard/evaluations");
}
