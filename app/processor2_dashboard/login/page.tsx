import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata = {
  robots: { index: false, follow: true },
};

export default function Processor2Login() {
  return (
    <section className="section">
      <h1>Processor2 Login</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        Sign in with your assigned processor employee account.
      </p>
      <AdminLoginForm
        action="/api/processor2/login"
        identifierLabel="Username"
        identifierName="username"
        identifierType="text"
      />
    </section>
  );
}
