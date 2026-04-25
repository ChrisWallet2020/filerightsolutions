import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { listProcessorUsers, type ProcessorRole } from "@/lib/processorUsers";
import { listProcessorToolsForAdmin } from "@/lib/processorTools";
import { ProcessorToolRolePicker } from "@/components/admin/ProcessorToolRolePicker";

export const dynamic = "force-dynamic";

function titleFor(role: ProcessorRole): string {
  return role === "processor1" ? "Processor1 accounts" : "Processor2 accounts";
}

function roleLabel(role: "processor1" | "processor2" | "both"): string {
  if (role === "both") return "Processor1 + Processor2";
  return role === "processor1" ? "Processor1 only" : "Processor2 only";
}

export default async function ProcessorAccountsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!isAdminAuthed()) redirect("/admin_dashboard/login");
  const saved = typeof searchParams.saved === "string" ? searchParams.saved : "";
  const error = typeof searchParams.error === "string" ? searchParams.error : "";
  const toolSaved = searchParams.toolSaved === "1";
  const toolError = typeof searchParams.toolError === "string" ? searchParams.toolError : "";
  const [p1, p2, tools] = await Promise.all([
    listProcessorUsers("processor1"),
    listProcessorUsers("processor2"),
    listProcessorToolsForAdmin(),
  ]);

  const sections: Array<{ role: ProcessorRole; rows: typeof p1 }> = [
    { role: "processor1", rows: p1 },
    { role: "processor2", rows: p2 },
  ];

  return (
    <section className="section" style={{ maxWidth: 980 }}>
      <h1>Processor accounts</h1>
      <p className="muted adminPageIntro">
        Create separate login accounts for each processor employee. Use username and password credentials for team members.
      </p>

      {saved ? (
        <div className="adminNotice adminNotice--success" style={{ marginTop: 14 }}>
          <strong className="adminNoticeTitle">Saved</strong>
          <p className="adminNoticeBody">
            {saved === "deleted" ? "Processor account deleted." : "Processor account created."}
          </p>
        </div>
      ) : null}
      {error ? (
        <div className="adminNotice adminNotice--error" style={{ marginTop: 14 }}>
          <strong className="adminNoticeTitle">Could not save account</strong>
          <p className="adminNoticeBody">
            {error === "duplicate"
              ? "That username is already in use for this processor team."
              : "Enter a valid username and a password with at least 6 characters."}
          </p>
        </div>
      ) : null}
      {toolSaved ? (
        <div className="adminNotice adminNotice--success" style={{ marginTop: 14 }}>
          <strong className="adminNoticeTitle">Tools updated</strong>
          <p className="adminNoticeBody">The downloadable tools list was updated.</p>
        </div>
      ) : null}
      {toolError ? (
        <div className="adminNotice adminNotice--error" style={{ marginTop: 14 }}>
          <strong className="adminNoticeTitle">Could not update tools</strong>
          <p className="adminNoticeBody">
            {toolError === "too_large"
              ? "Upload failed: file must be 150 MB or smaller."
              : toolError === "empty"
                ? "Upload failed: choose a file first."
                : "Upload failed: check inputs and try again."}
          </p>
        </div>
      ) : null}

      <div className="adminStack" style={{ marginTop: 16 }}>
        {sections.map((section) => (
          <section key={section.role} className="adminCard">
            <h2>{titleFor(section.role)}</h2>
            <form action="/api/admin/processor-accounts" method="post" className="form" style={{ maxWidth: 520, marginTop: 10 }}>
              <input type="hidden" name="role" value={section.role} />
              <label className="adminLabel">
                <strong>Username</strong>
                <input name="username" type="text" autoComplete="off" placeholder="Enter username" required />
              </label>
              <label className="adminLabel">
                <strong>Password</strong>
                <input
                  name="password"
                  type="password"
                  minLength={6}
                  autoComplete="off"
                  placeholder="Enter password"
                  required
                />
              </label>
              <button type="submit" className="btn" style={{ width: "fit-content" }}>
                Add account
              </button>
            </form>

            <div style={{ marginTop: 14 }}>
              {section.rows.length === 0 ? (
                <p className="muted adminBodyText">No employee accounts yet.</p>
              ) : (
                <div className="incomeTableWrap">
                  <table className="incomeTable">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Password</th>
                        <th>Created</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((u) => (
                        <tr key={u.id}>
                          <td>{u.username}</td>
                          <td>{u.passwordPlain || "—"}</td>
                          <td>{new Date(u.createdAt).toLocaleString("en-PH")}</td>
                          <td>
                            <form action="/api/admin/processor-accounts" method="post">
                              <input type="hidden" name="intent" value="delete" />
                              <input type="hidden" name="role" value={section.role} />
                              <input type="hidden" name="id" value={u.id} />
                              <button type="submit" className="btn btnSecondary">
                                Delete
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ))}

        <section className="adminCard">
          <h2>Tools downloads</h2>
          <p className="muted adminBodyText" style={{ marginTop: 8 }}>
            Upload installers and work tools here. Processor employees can download them from their new Tools tab.
          </p>

          <form
            action="/api/admin/processor-tools"
            method="post"
            encType="multipart/form-data"
            className="form"
            style={{ maxWidth: 620, marginTop: 10 }}
          >
            <label className="adminLabel">
              <strong>Available to</strong>
              <ProcessorToolRolePicker defaultValue="both" />
            </label>
            <label className="adminLabel">
              <strong>Tool file</strong>
              <input name="file" type="file" required />
            </label>
            <button type="submit" className="btn" style={{ width: "fit-content" }}>
              Upload tool
            </button>
          </form>

          <div style={{ marginTop: 14 }}>
            {tools.length < 1 ? (
              <p className="muted adminBodyText">No tools uploaded yet.</p>
            ) : (
              <div className="incomeTableWrap">
                <table className="incomeTable">
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Visible to</th>
                      <th>Size</th>
                      <th>Uploaded</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tools.map((tool) => (
                      <tr key={tool.id}>
                        <td>{tool.filename}</td>
                        <td>{roleLabel(tool.targetRole)}</td>
                        <td>{Math.max(1, Math.round(tool.sizeBytes / 1024)).toLocaleString("en-PH")} KB</td>
                        <td>{new Date(tool.createdAt).toLocaleString("en-PH")}</td>
                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <a
                            href={`/api/processor-tools/${encodeURIComponent(tool.id)}`}
                            className="btn btnSecondary"
                            style={{ textDecoration: "none" }}
                          >
                            Download
                          </a>
                          <form action="/api/admin/processor-tools" method="post">
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="id" value={tool.id} />
                            <button type="submit" className="btn btnSecondary">
                              Delete
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
