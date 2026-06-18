import { ThemeToggle } from "@/components/theme-toggle";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12 bg-primary text-primary-foreground">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NextSaas</h1>
          <p className="mt-2 text-sm opacity-70">The production-ready Next.js SaaS starter</p>
        </div>
        <ul className="space-y-4 text-sm opacity-80">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
            Multi-tenant organizations
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
            Secure session authentication
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
            Flexible SQL database
          </li>
        </ul>
        <p className="text-xs opacity-40">© 2026 NextSaas Boilerplate</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col flex-1 bg-background">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
