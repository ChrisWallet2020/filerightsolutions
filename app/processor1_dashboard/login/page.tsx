import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata = {
  robots: { index: false, follow: true },
};

export default function Processor1Login() {
  return (
    <section className="section">
      <h1>Processor1 Login</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        Sign in with your assigned processor employee account.
      </p>
      <AdminLoginForm
        action="/api/processor1/login"
        identifierLabel="Username"
        identifierName="username"
        identifierType="text"
      />
    </section>
  );
}
