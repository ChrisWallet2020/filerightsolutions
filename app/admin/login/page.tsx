import { Button } from "@/components/ui/Button";

export default function AdminLogin() {
  return (
    <section className="section">
      <h1>Admin Login</h1>
      <form action="/api/admin/login" method="post" className="form" style={{ maxWidth: 420 }}>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        <Button type="submit" className="wFull">Login</Button>
      </form>
    </section>
  );
}