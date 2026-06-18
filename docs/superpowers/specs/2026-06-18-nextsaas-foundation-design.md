# Design Specification: NextSaas Foundation & Flexible SQL Database Layer

* **Date**: 2026-06-18
* **Topic**: Foundation & Flexible SQL Database Setup (Phase 1)
* **Status**: Approved by User

---

## 1. Goal & Context
The goal is to create the foundation of a modern SaaS boilerplate using Next.js (App Router), Tailwind CSS v4, and shadcn/ui. The boilerplate must be flexible enough to target PostgreSQL, MySQL, or MariaDB at setup time. We will include a baseline integration testing configuration using Playwright.

---

## 2. Directory Structure
```
/
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-06-18-nextsaas-foundation-design.md
├── scripts/
│   └── setup-db.js          # CLI setup wizard for choosing dialect
├── src/
│   ├── app/                 # Next.js App Router root
│   │   ├── layout.tsx       # Root layout with ThemeProvider
│   │   └── page.tsx         # Initial Landing/Welcome page
│   ├── components/          # UI components (shadcn-based)
│   │   ├── ui/              # Primitive UI components
│   │   └── theme-toggle.tsx # Global theme changer dropdown/button
│   ├── db/                  # Main database entry folder
│   │   ├── templates/       # Pre-configured dialect templates
│   │   │   ├── postgres/    # pg specific schema & client
│   │   │   ├── mysql/       # mysql2 specific schema & client
│   │   │   └── mariadb/     # mariadb specific schema & client
│   │   ├── schema.ts        # Active schema (copied from templates)
│   │   ├── client.ts        # Active client connection (copied from templates)
│   │   └── index.ts         # Exposes active client & schema
│   ├── lib/                 # Standard utilities (cn helper, etc.)
│   └── styles/
│       └── globals.css      # Tailwind v4 import and custom variables
├── tests/
│   └── integration/
│       └── landing.spec.ts  # Playwright baseline integration tests
├── drizzle.config.ts        # Active Drizzle kit config (copied from templates)
├── package.json             # Core Next.js configuration
├── playwright.config.ts     # Playwright integration testing configuration
└── tsconfig.json            # TypeScript configuration
```

---

## 3. Flexible SQL Database Architecture (Approach A)
We provide a setup-time CLI script that copies the correct dialect configurations and schemas into the active path, ensuring clean imports and zero-dependency bloat.

### Setup CLI (`scripts/setup-db.js`)
An interactive script run via `npm run db:setup` or `node scripts/setup-db.js`:
1. Prompts: "Select your Database dialect: 1) PostgreSQL, 2) MySQL, 3) MariaDB".
2. Checks target folder `/src/db/templates/<selection>/`.
3. Copies:
   - `src/db/templates/<selection>/schema.ts` $\rightarrow$ `src/db/schema.ts`
   - `src/db/templates/<selection>/client.ts` $\rightarrow$ `src/db/client.ts`
   - `src/db/templates/<selection>/drizzle.config.ts` $\rightarrow$ `drizzle.config.ts`
4. Automatically runs `npm install <driver>` (e.g. `pg` or `mysql2`) to ensure only the selected database driver is installed.
5. Populates database connection details in `.env.local`.

### Database Schema Designs (`schema.ts`)
To keep the templates functionally identical but syntactically correct for each dialect:
* **PostgreSQL Schema**:
  ```typescript
  import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
  
  export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull()
  });
  ```
* **MySQL / MariaDB Schema**:
  ```typescript
  import { mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core";
  
  export const users = mysqlTable("users", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: varchar("email", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull()
  });
  ```

---

## 4. Styling & Multi-Theme Configuration
Tailwind CSS v4 will be configured using standard CSS variables inside `src/styles/globals.css`.

### Global CSS (`src/styles/globals.css`)
```css
@import "tailwindcss";

@theme {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --radius-lg: var(--radius);
}

/* Base Light Theme */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --border: oklch(0.92 0 0);
  --input: oklch(0.92 0 0);
  --radius: 0.5rem;
}

/* Base Dark Theme */
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --border: oklch(0.25 0 0);
  --input: oklch(0.25 0 0);
}

/* Optional Custom Themes (e.g., Cyberpunk) */
.theme-cyberpunk {
  --background: oklch(0.18 0.12 320);
  --foreground: oklch(0.92 0.05 320);
  --primary: oklch(0.70 0.30 330);
  --primary-foreground: oklch(0.1 0 0);
  --border: oklch(0.3 0.1 320);
}
```

---

## 5. Integration Testing Setup (Playwright)
We set up Playwright (`@playwright/test`) to verify standard visual, interactive, and API properties.
* A basic configuration is provided in `playwright.config.ts`.
* Tests are stored under `tests/integration/`.
* Running tests spins up the Next.js local server on port 3000 automatically.

---

## 6. Verification Plan
We will verify the setup using:
1. **TypeScript Build**: Running `npm run build` checks compile correctness.
2. **Database Setup Script**: Running `npm run db:setup` and verifying that the correct configuration, schema, and driver are initialized.
3. **Integration Test Suite**: Running `npx playwright test` ensures the dev server works and the baseline layout elements compile.
