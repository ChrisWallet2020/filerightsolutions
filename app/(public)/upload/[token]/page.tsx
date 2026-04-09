import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";

export default async function UploadPage({ params }: { params: { token: string } }) {
  const order = await prisma.order.findUnique({ where: { uploadToken: params.token }, include: { pkg: true, uploads: true } });
  if (!order) return <section className="section">Invalid upload link.</section>;

  return (
    <section className="section">
      <h1>Upload Documents</h1>
      <p className="muted">
        Order ID: <strong>{order.orderId}</strong> — {order.pkg.name}
      </p>

      <div className="notice">
        <p>
          Documents are uploaded through a private portal and accessible only to authorized personnel.
          For questions: {config.supportEmail}
        </p>
      </div>

      <form action="/api/uploads" method="post" encType="multipart/form-data" className="form">
        <input type="hidden" name="uploadToken" value={params.token} />
        <label>
          Select files
          <input type="file" name="files" multiple required />
        </label>
        <Button type="submit">Upload</Button>
      </form>

      {order.uploads.length > 0 && (
        <div className="section">
          <h2>Uploaded Files</h2>
          <ul className="muted">
            {order.uploads.map((u) => (
              <li key={u.id}>{u.filename} ({Math.round(u.sizeBytes / 1024)} KB)</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}