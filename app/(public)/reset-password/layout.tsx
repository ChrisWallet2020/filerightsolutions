import { config } from "@/lib/config";

export const metadata = {
  title: `Reset password — ${config.siteName}`,
  description: "Set a new password for your account.",
};

export default function ResetPasswordSegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
