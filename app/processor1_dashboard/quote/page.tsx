import { redirect } from "next/navigation";
import { isAdminAuthed, isProcessor1Authed } from "@/lib/auth";
import { getProcessor1Credentials } from "@/lib/siteSettings";
import { QuoteWorkspace } from "@/components/admin/QuoteWorkspace";

export const dynamic = "force-dynamic";

export default async function Processor1QuotePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (isAdminAuthed()) {
    // admin may open quote tools without Processor1 session
  } else {
    const creds = await getProcessor1Credentials();
    if (!isProcessor1Authed(creds.username)) {
      redirect("/processor1_dashboard/login");
    }
  }

  return <QuoteWorkspace searchParams={searchParams} quoteUploaderRole="processor1" />;
}
