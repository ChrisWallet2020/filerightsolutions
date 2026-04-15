import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
