import { redirect } from "next/navigation";
import { getProcessor1Credentials } from "@/lib/siteSettings";
import { isProcessor1Authed } from "@/lib/auth";
import { listProcessorToolsForRole } from "@/lib/processorTools";

export const dynamic = "force-dynamic";

export default async function Processor1ToolsPage() {
  const creds = await getProcessor1Credentials();
  if (!isProcessor1Authed(creds.username)) {
    redirect("/processor1_dashboard/login");
  }

  const tools = await listProcessorToolsForRole("processor1");

  return (
    <section className="section" style={{ maxWidth: 980 }}>
      <h1>Tools</h1>
      <p className="muted adminPageIntro">
        Download all tools and installers uploaded by admin for your processor workspace.
      </p>
      <div className="adminCard" style={{ marginTop: 16 }}>
        {tools.length < 1 ? (
          <p className="muted adminBodyText">No tools are available yet. Please check again later.</p>
        ) : (
          <div className="incomeTableWrap">
            <table className="incomeTable">
              <thead>
                <tr>
                  <th>Tool file</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((tool) => (
                  <tr key={tool.id}>
                    <td>{tool.filename}</td>
                    <td>{Math.max(1, Math.round(tool.sizeBytes / 1024)).toLocaleString("en-PH")} KB</td>
                    <td>{new Date(tool.createdAt).toLocaleString("en-PH")}</td>
                    <td>
                      <a href={`/api/processor-tools/${encodeURIComponent(tool.id)}`} className="btn btnSecondary">
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
