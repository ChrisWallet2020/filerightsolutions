import { redirect } from "next/navigation";
import { isAdminAuthed, isProcessor2Authed } from "@/lib/auth";
import { getProcessor2Credentials } from "@/lib/siteSettings";
import { QuoteWorkspace } from "@/components/admin/QuoteWorkspace";

export const dynamic = "force-dynamic";

export default async function Processor2QuotePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (isAdminAuthed()) {
    // admin may open quote tools without Processor2 session
  } else {
    const creds = await getProcessor2Credentials();
    if (!isProcessor2Authed(creds.username)) {
      redirect("/processor2_dashboard/login");
    }
  }

  return <QuoteWorkspace searchParams={searchParams} quoteUploaderRole="processor2" />;
}
