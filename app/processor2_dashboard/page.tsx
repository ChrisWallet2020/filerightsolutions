import { redirect } from "next/navigation";
import { getProcessor2Credentials } from "@/lib/siteSettings";
import { isProcessor2Authed } from "@/lib/auth";

export default async function Processor2IndexPage() {
  const creds = await getProcessor2Credentials();
  if (!isProcessor2Authed(creds.username)) {
    redirect("/processor2_dashboard/login");
  }
  redirect("/processor2_dashboard/evaluations");
}
