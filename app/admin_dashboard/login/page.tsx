import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata = {
  robots: { index: false, follow: true },
};

export default function AdminLogin() {
  return (
    <section className="section">
      <h1>Admin Login</h1>
      <AdminLoginForm />
    </section>
  );
}