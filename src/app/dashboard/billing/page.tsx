import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import BillingDashboardClient from "./BillingDashboardClient";

export const metadata = {
  title: "Billing & Subscriptions — NextSaas",
  description: "Manage your NextSaas organization billing and subscriptions.",
};

export default async function BillingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  let activeSub = null;

  if (user.organizationId) {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, user.organizationId))
      .limit(1);

    if (sub) {
      activeSub = {
        id: sub.id,
        provider: sub.provider,
        providerSubscriptionId: sub.providerSubscriptionId,
        providerPriceId: sub.providerPriceId,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      };
    }
  }

  return (
    <BillingDashboardClient
      user={{
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      }}
      subscription={activeSub}
    />
  );
}
