import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiKeysManagerClient } from "./ApiKeysManagerClient";

export const metadata = {
  title: "API Keys Settings — NextSaas",
  description: "Manage your organization API keys for external integrations.",
};

export default async function ApiKeysSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "owner" || !user.organizationId) {
    redirect("/settings/security");
  }

  const existingKeys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      truncatedKey: apiKeys.truncatedKey,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.organizationId, user.organizationId));

  const serializedKeys = existingKeys.map(k => ({
    id: k.id,
    name: k.name,
    truncatedKey: k.truncatedKey,
    createdAt: k.createdAt.toISOString(),
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
  }));

  return (
    <SettingsSidebar userRole={user.role}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">API Keys</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate and manage secure API keys to integrate your organization programmatically.
        </p>
      </div>

      <div className="space-y-6">
        <ApiKeysManagerClient initialKeys={serializedKeys} />
      </div>
    </SettingsSidebar>
  );
}
