import { AuthLayout } from "@/components/auth/auth-layout";
import { Verify2FAForm } from "@/components/auth/verify-2fa-form";

export const metadata = {
  title: "Two-Factor Verification — NextSaas",
  description: "Enter your two-factor authentication code.",
};

export default function Verify2FAPage() {
  return (
    <AuthLayout>
      <Verify2FAForm />
    </AuthLayout>
  );
}
