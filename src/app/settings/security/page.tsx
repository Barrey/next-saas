import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { TwoFactorForm } from "@/components/settings/two-factor-form";

export const metadata = {
  title: "Security Settings — NextSaas",
  description: "Manage your account security and two-factor authentication.",
};

export default async function SecuritySettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <SettingsSidebar userRole={user.role}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Security Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account security preferences and settings.
        </p>
      </div>

      <div className="space-y-6">
        <ChangePasswordForm />
        <TwoFactorForm initialEnabled={user.twoFactorEnabled} />
      </div>
    </SettingsSidebar>
  );
}
