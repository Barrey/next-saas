import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export const metadata = {
  title: "Dashboard — NextSaas",
  description: "Your NextSaas workspace dashboard.",
};

function RoleBadge({ role }: { role: string | null }) {
  if (role === "owner") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
        Owner
      </span>
    );
  }
  if (role === "member") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-200">
        Member
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      —
    </span>
  );
}

async function LogoutButton() {
  async function logout() {
    "use server";
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.delete("session_token");
    redirect("/login");
  }

  return (
    <form action={logout}>
      <Button
        id="dashboard-logout"
        type="submit"
        variant="outline"
      >
        Log out
      </Button>
    </form>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your account overview.</p>
        </div>

        <Card id="dashboard-user-card" className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Account</CardTitle>
            <RoleBadge role={user.role} />
          </CardHeader>

          <CardContent className="space-y-3 pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p id="dashboard-email" className="text-sm font-medium text-foreground mt-0.5">
                {user.email}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Organization</p>
              <p id="dashboard-org" className="text-sm font-medium text-foreground mt-0.5">
                {user.organizationId ? user.organizationId : "No organization"}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 w-full">
          <Button asChild className="flex-1" id="planner-demo-link">
            <Link href="/demo/planner">AI Travel Planner (Demo)</Link>
          </Button>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
