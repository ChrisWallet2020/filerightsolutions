import { config } from "@/lib/config";

export const metadata = {
  title: `Forgot password — ${config.siteName}`,
  description: "Request a link to reset your password.",
};

export default function ForgotPasswordSegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
