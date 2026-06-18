# NextSaas Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation of NextSaas: a Next.js 15 app router template configured with Tailwind CSS v4, dynamic multi-theme support, a setup-time configurable SQL database layer (Postgres, MySQL, MariaDB) using Drizzle ORM, and baseline Playwright integration testing.

**Architecture:** We scaffold the React/Next.js foundation and structure a template-based DB driver copier (`scripts/setup-db.js`) that provisions a chosen dialect to `src/db/`. We structure the styles using Tailwind CSS v4 global theme variables and run Playwright testing against the active dev server to verify layout and behavior.

**Tech Stack:** Next.js 15, React 19, TypeScript, Drizzle ORM, Tailwind CSS v4, Playwright, next-themes.

## Global Constraints
- Avoid using TailwindCSS unless requested (v4 is explicitly requested by user).
- Follow Approach A for database setup: pre-configured templates swapped at setup-time.
- Multi-theme configuration must support light, dark, and custom themes (like Cyberpunk) globally using CSS custom variables.

---

### Task 1: Scaffolding and Basic Next.js App Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/styles/globals.css`
- Create: `src/lib/utils.ts`

**Interfaces:**
- Consumes: None
- Produces: Initial compilable Next.js 15 App with Tailwind CSS v4.

- [ ] **Step 1: Create package.json**
  Write the core configuration with Next.js 15, React 19, Tailwind CSS v4, and class merge utilities.
  ```json
  {
    "name": "nextsaas-boilerplate",
    "version": "0.1.0",
    "private": true,
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start"
    },
    "dependencies": {
      "next": "15.1.0",
      "react": "19.0.0",
      "react-dom": "19.0.0",
      "clsx": "^2.1.1",
      "tailwind-merge": "^2.5.5"
    },
    "devDependencies": {
      "@types/node": "^22.10.1",
      "@types/react": "^19.0.1",
      "@types/react-dom": "^19.0.1",
      "typescript": "^5.7.2",
      "postcss": "^8.4.49",
      "@tailwindcss/postcss": "^4.0.0-alpha.30"
    }
  }
  ```

- [ ] **Step 2: Create tsconfig.json**
  Define TS options for Next.js app router.
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "lib": ["dom", "dom.iterable", "esnext"],
      "allowJs": true,
      "skipLibCheck": true,
      "strict": true,
      "noEmit": true,
      "esModuleInterop": true,
      "module": "esnext",
      "moduleResolution": "bundler",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "jsx": "preserve",
      "incremental": true,
      "plugins": [
        {
          "name": "next"
        }
      ],
      "paths": {
        "@/*": ["./src/*"]
      }
    },
    "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    "exclude": ["node_modules"]
  }
  ```

- [ ] **Step 3: Create postcss.config.mjs**
  Configure Tailwind v4 postcss integration.
  ```javascript
  export default {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  };
  ```

- [ ] **Step 4: Create styles/globals.css**
  Define Tailwind v4 base styles.
  ```css
  @import "tailwindcss";

  @theme {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-border: var(--border);
    --radius-lg: var(--radius);
  }

  :root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    --border: oklch(0.92 0 0);
    --radius: 0.5rem;
  }
  ```

- [ ] **Step 5: Create src/lib/utils.ts**
  Create helper for mixing Tailwind classes.
  ```typescript
  import { clsx, type ClassValue } from "clsx";
  import { twMerge } from "tailwind-merge";

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```

- [ ] **Step 6: Create default layout.tsx and page.tsx**
  Scaffold base routes.
  * Layout:
    ```tsx
    import "@/styles/globals.css";

    export const metadata = {
      title: "NextSaas Boilerplate",
      description: "Production-ready Next.js SaaS starter kit",
    };

    export default function RootLayout({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return (
        <html lang="en">
          <body className="bg-background text-foreground antialiased">
            {children}
          </body>
        </html>
      );
    }
    ```
  * Page:
    ```tsx
    export default function Page() {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8">
          <h1 className="text-4xl font-bold tracking-tight">NextSaas Boilerplate</h1>
          <p className="mt-2 text-muted-foreground">Setup-time Database configurations and clean styling.</p>
        </main>
      );
    }
    ```

- [ ] **Step 7: Verify project builds successfully**
  Run: `npm install`
  Run: `npm run build`
  Expected: Successful compilation without errors, creating the `.next` output bundle.

- [ ] **Step 8: Commit**
  Run: `git add package.json tsconfig.json postcss.config.mjs src/`
  Run: `git commit -m "feat: scaffold next.js app with tailwind v4 foundation"`

---

### Task 2: Setup Database CLI Script & Dialect Templates

**Files:**
- Create: `scripts/setup-db.js`
- Create: `src/db/index.ts`
- Create: `src/db/templates/postgres/schema.ts`
- Create: `src/db/templates/postgres/client.ts`
- Create: `src/db/templates/postgres/drizzle.config.ts`
- Create: `src/db/templates/mysql/schema.ts`
- Create: `src/db/templates/mysql/client.ts`
- Create: `src/db/templates/mysql/drizzle.config.ts`
- Create: `src/db/templates/mariadb/schema.ts`
- Create: `src/db/templates/mariadb/client.ts`
- Create: `src/db/templates/mariadb/drizzle.config.ts`

**Interfaces:**
- Consumes: None
- Produces: Setup CLI script that switches schemas and installs corresponding SQL packages at setup time.

- [ ] **Step 1: Install core Drizzle packages**
  Run: `npm install drizzle-orm dotenv`
  Run: `npm install -D drizzle-kit`

- [ ] **Step 2: Create Postgres Template files**
  * Schema (`src/db/templates/postgres/schema.ts`):
    ```typescript
    import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

    export const users = pgTable("users", {
      id: uuid("id").defaultRandom().primaryKey(),
      email: varchar("email", { length: 255 }).notNull().unique(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    ```
  * Client (`src/db/templates/postgres/client.ts`):
    ```typescript
    import { drizzle } from "drizzle-orm/node-postgres";
    import pg from "pg";
    import * as schema from "./schema";

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });

    export const db = drizzle(pool, { schema });
    ```
  * Config (`src/db/templates/postgres/drizzle.config.ts`):
    ```typescript
    import { defineConfig } from "drizzle-kit";
    import "dotenv/config";

    export default defineConfig({
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dialect: "postgresql",
      dbCredentials: {
        url: process.env.DATABASE_URL || "",
      },
    });
    ```

- [ ] **Step 3: Create MySQL Template files**
  * Schema (`src/db/templates/mysql/schema.ts`):
    ```typescript
    import { mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core";

    export const users = mysqlTable("users", {
      id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
      email: varchar("email", { length: 255 }).notNull().unique(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    ```
  * Client (`src/db/templates/mysql/client.ts`):
    ```typescript
    import { drizzle } from "drizzle-orm/mysql2";
    import mysql from "mysql2/promise";
    import * as schema from "./schema";

    const connection = await mysql.createConnection(process.env.DATABASE_URL || "");

    export const db = drizzle(connection, { schema });
    ```
  * Config (`src/db/templates/mysql/drizzle.config.ts`):
    ```typescript
    import { defineConfig } from "drizzle-kit";
    import "dotenv/config";

    export default defineConfig({
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dialect: "mysql",
      dbCredentials: {
        url: process.env.DATABASE_URL || "",
      },
    });
    ```

- [ ] **Step 4: Create MariaDB Template files**
  * Schema (`src/db/templates/mariadb/schema.ts`): Same as MySQL template.
  * Client (`src/db/templates/mariadb/client.ts`): Same as MySQL template.
  * Config (`src/db/templates/mariadb/drizzle.config.ts`):
    ```typescript
    import { defineConfig } from "drizzle-kit";
    import "dotenv/config";

    export default defineConfig({
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dialect: "singlestore", // drizzle-kit uses SingleStore or generic mysql for mariadb migrations
      dbCredentials: {
        url: process.env.DATABASE_URL || "",
      },
    });
    ```

- [ ] **Step 5: Create main Database entry point**
  Create `src/db/index.ts` to cleanly export DB and schema variables:
  ```typescript
  export * from "./schema";
  export { db } from "./client";
  ```

- [ ] **Step 6: Write setup script (`scripts/setup-db.js`)**
  Create the execution wizard script that moves templates to their active destinations:
  ```javascript
  const fs = require("fs");
  const path = require("path");
  const { execSync } = require("child_process");

  const choice = process.argv[2];
  if (!choice || !["postgres", "mysql", "mariadb"].includes(choice)) {
    console.error("Usage: node scripts/setup-db.js <postgres|mysql|mariadb>");
    process.exit(1);
  }

  const templatesDir = path.join(__dirname, "../src/db/templates", choice);
  const targetDbDir = path.join(__dirname, "../src/db");
  const rootDir = path.join(__dirname, "..");

  console.log(`Setting up database files for: ${choice}...`);

  // Copy Schema
  fs.copyFileSync(
    path.join(templatesDir, "schema.ts"),
    path.join(targetDbDir, "schema.ts")
  );

  // Copy Client
  fs.copyFileSync(
    path.join(templatesDir, "client.ts"),
    path.join(targetDbDir, "client.ts")
  );

  // Copy Drizzle Config to Root
  fs.copyFileSync(
    path.join(templatesDir, "drizzle.config.ts"),
    path.join(rootDir, "drizzle.config.ts")
  );

  console.log("Config files copied. Installing drivers...");

  // Install Driver
  if (choice === "postgres") {
    execSync("npm install pg && npm install -D @types/pg", { stdio: "inherit" });
  } else {
    execSync("npm install mysql2", { stdio: "inherit" });
  }

  // Create Env template if it doesn't exist
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) {
    const defaultUrl = choice === "postgres" 
      ? "postgresql://postgres:postgres@localhost:5432/nextsaas"
      : "mysql://root:password@localhost:3306/nextsaas";
    fs.writeFileSync(envPath, `DATABASE_URL="${defaultUrl}"\n`);
    console.log(`.env.local file created with default url: ${defaultUrl}`);
  }

  console.log("Database environment set up successfully!");
  ```

- [ ] **Step 7: Add script shortcut to package.json**
  Update package.json in `package.json` to include `"db:setup": "node scripts/setup-db.js"`.
  Also verify we can run the script:
  Run: `npm run db:setup postgres`
  Expected:
  - Copy of `schema.ts`, `client.ts` to `src/db/`
  - Copy of `drizzle.config.ts` to root
  - Installation of `pg` package.

- [ ] **Step 8: Commit**
  Run: `git add scripts/ src/db/ package.json`
  Run: `git commit -m "feat: add SQL database CLI setup wizard and dialect templates"`

---

### Task 3: Global Theme Switcher & Playwright Verification

**Files:**
- Create: `src/components/theme-provider.tsx`
- Create: `src/components/theme-toggle.tsx`
- Create: `playwright.config.ts`
- Create: `tests/integration/landing.spec.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/styles/globals.css`

**Interfaces:**
- Consumes: Next.js app scaffolding, tailwind structure
- Produces: Fully functional dark/light/cyberpunk mode switcher verified via Playwright integration tests.

- [ ] **Step 1: Install next-themes, lucide-react & Playwright**
  Run: `npm install next-themes lucide-react`
  Run: `npm install -D @playwright/test`

- [ ] **Step 2: Create theme-provider.tsx**
  Implement theme provider wrapper for App Router:
  ```tsx
  "use html";
  "use client";

  import * as React from "react";
  import { ThemeProvider as NextThemesProvider } from "next-themes";

  export function ThemeProvider({
    children,
    ...props
  }: React.ComponentProps<typeof NextThemesProvider>) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
  }
  ```

- [ ] **Step 3: Create theme-toggle.tsx**
  Build theme controller UI switching between Light, Dark, and Cyberpunk:
  ```tsx
  "use html";
  "use client";

  import * as React from "react";
  import { useTheme } from "next-themes";
  import { Sun, Moon, Sparkles } from "lucide-react";

  export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
      <div className="flex items-center gap-2 rounded-lg border border-border p-1 bg-card">
        <button
          onClick={() => setTheme("light")}
          className={`p-2 rounded-md transition-colors ${theme === "light" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          aria-label="Light theme"
        >
          <Sun className="h-4 w-4" />
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`p-2 rounded-md transition-colors ${theme === "dark" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          aria-label="Dark theme"
        >
          <Moon className="h-4 w-4" />
        </button>
        <button
          onClick={() => setTheme("theme-cyberpunk")}
          className={`p-2 rounded-md transition-colors ${theme === "theme-cyberpunk" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          aria-label="Cyberpunk theme"
        >
          <Sparkles className="h-4 w-4" />
        </button>
      </div>
    );
  }
  ```

- [ ] **Step 4: Update Global CSS theme styling**
  Provide color schemas inside `src/styles/globals.css` mapping to Tailwind variables:
  Replace CSS custom property block:
  ```css
  @import "tailwindcss";

  @theme {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-border: var(--border);
    --color-card: var(--card);
    --color-muted-foreground: var(--muted-foreground);
    --color-accent: var(--accent);
    --radius-lg: var(--radius);
  }

  :root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    --card: oklch(0.985 0 0);
    --border: oklch(0.92 0 0);
    --accent: oklch(0.96 0 0);
    --muted-foreground: oklch(0.55 0 0);
    --radius: 0.5rem;
  }

  .dark {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --primary: oklch(0.985 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --card: oklch(0.18 0 0);
    --border: oklch(0.25 0 0);
    --accent: oklch(0.2 0 0);
    --muted-foreground: oklch(0.65 0 0);
  }

  .theme-cyberpunk {
    --background: oklch(0.18 0.12 320);
    --foreground: oklch(0.92 0.05 320);
    --primary: oklch(0.70 0.30 330);
    --primary-foreground: oklch(0.1 0 0);
    --card: oklch(0.2 0.1 320);
    --border: oklch(0.3 0.1 320);
    --accent: oklch(0.4 0.15 320);
    --muted-foreground: oklch(0.7 0.1 320);
  }
  ```

- [ ] **Step 5: Modify layout.tsx to implement theme injection**
  ```tsx
  import "@/styles/globals.css";
  import { ThemeProvider } from "@/components/theme-provider";

  export const metadata = {
    title: "NextSaas Boilerplate",
    description: "Production-ready Next.js SaaS starter kit",
  };

  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className="bg-background text-foreground antialiased transition-colors duration-200">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    );
  }
  ```

- [ ] **Step 6: Update page.tsx to embed Theme Toggle UI**
  ```tsx
  import { ThemeToggle } from "@/components/theme-toggle";

  export default function Page() {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background text-foreground">
        <div className="flex flex-col items-center max-w-md text-center">
          <h1 className="text-4xl font-bold tracking-tight">NextSaas Boilerplate</h1>
          <p className="mt-2 text-muted-foreground">Setup-time Database configurations, clean custom themes and integration testing.</p>
          <div className="mt-6">
            <ThemeToggle />
          </div>
        </div>
      </main>
    );
  }
  ```

- [ ] **Step 7: Create playwright.config.ts**
  ```typescript
  import { defineConfig, devices } from "@playwright/test";

  export default defineConfig({
    testDir: "./tests/integration",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: "list",
    use: {
      baseURL: "http://localhost:3000",
      trace: "on-first-retry",
    },
    projects: [
      {
        name: "chromium",
        use: { ...devices["Desktop Chrome"] },
      },
    ],
    webServer: {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  });
  ```

- [ ] **Step 8: Create tests/integration/landing.spec.ts**
  Write test checking that NextSaas title renders and dark/cyberpunk themes apply properly to the active page:
  ```typescript
  import { test, expect } from "@playwright/test";

  test("should render the landing page and have correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("NextSaas Boilerplate");
  });

  test("should support toggling themes globally via buttons", async ({ page }) => {
    await page.goto("/");
    
    // Check initial state or set light mode
    await page.click('button[aria-label="Light theme"]');
    await expect(page.locator("html")).toHaveClass(/light/);

    // Set dark mode
    await page.click('button[aria-label="Dark theme"]');
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Set cyberpunk mode
    await page.click('button[aria-label="Cyberpunk theme"]');
    await expect(page.locator("html")).toHaveClass(/theme-cyberpunk/);
  });
  ```

- [ ] **Step 9: Run Integration Tests**
  Run: `npx playwright install chromium`
  Run: `npx playwright test`
  Expected: Both tests pass successfully.

- [ ] **Step 10: Commit**
  Run: `git add src/ tests/ playwright.config.ts`
  Run: `git commit -m "feat: add global theme switcher and Playwright integration verification"`
