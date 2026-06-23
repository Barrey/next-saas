import * as React from "react";
import Link from "next/link";
import { User, ShieldAlert, ArrowLeft } from "lucide-react";

interface SettingsSidebarProps {
  children: React.ReactNode;
}

export function SettingsSidebar({ children }: SettingsSidebarProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Settings Navigation Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-6 hidden md:block">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h2 className="text-xl font-bold tracking-tight text-foreground mt-4">Settings</h2>
        </div>

        <nav className="space-y-1">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground cursor-not-allowed opacity-50">
            <User className="h-4 w-4" />
            Profile
          </div>
          <Link
            href="/settings/security"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground transition-colors"
          >
            <ShieldAlert className="h-4 w-4" />
            Security & 2FA
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 max-w-4xl">
        {/* Mobile Header */}
        <div className="mb-6 md:hidden">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Settings</h2>
          <nav className="flex gap-2 mt-4 border-b border-border pb-2">
            <span className="px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-50">
              Profile
            </span>
            <Link
              href="/settings/security"
              className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md"
            >
              Security & 2FA
            </Link>
          </nav>
        </div>

        <div className="space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
