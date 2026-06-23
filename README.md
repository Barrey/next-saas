# NextSaas Boilerplate

NextSaas is a modern, feature-rich Next.js 15 SaaS boilerplate designed for rapid development. It supports multiple SQL databases, advanced stateful session authentication, rate lockouts, 2FA, OAuth, multi-tenancy organizations, and pluggable Stripe billing integrations.

For a detailed implementation guide and architectural details, see the **[Detailed Boilerplate User Guide](docs/boilerplate-user-guide.md)**.

---

## Technical Stack

* **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui.
* **Database & ORM**: Drizzle ORM supporting PostgreSQL, MySQL, and MariaDB.
* **Authentication**: Custom session management, scrypt password hashing, rate lockouts, Magic Links, 2FA (TOTP), Google/GitHub/Facebook OAuth.
* **Billing**: Stripe Checkout, Stripe Customer Portal, and Stripe webhook handling.
* **Testing**: Playwright integration test suite.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Your Database Dialect
Initialize the schema and drivers for your chosen SQL dialect:
```bash
# Setup Postgres schema & drivers
npm run db:setup postgres

# Setup MySQL schema & drivers
npm run db:setup mysql

# Setup MariaDB schema & drivers
npm run db:setup mariadb
```

### 3. Setup Environment Variables
Configure your environment variables in `.env.local` (a base template is generated automatically during database setup). 

Example `.env.local`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nextsaas"
MOCK_DB="false"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BILLING_PROVIDER="stripe"
STRIPE_SECRET_KEY="your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="your_stripe_webhook_secret"
```
*Note: To run tests or develop without setting up live SQL databases or Stripe, set `MOCK_DB="true"` to run in keyless mock mode.*

### 4. Run Migrations & Seed Data
```bash
# Generate and run SQL migrations
npm run db:generate
npm run db:migrate

# Seed database with mock users and organizations
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` to view the application.

---

## Running Tests
Run the full Playwright integration and regression test suite:
```bash
# Run tests
npx playwright test
```
*On Windows machines experiencing PowerShell script execution restrictions, bypass using cmd:*
```bash
cmd /c "npx playwright test"
```

---

## Documentation
* **Detailed Boilerplate Guide**: [docs/boilerplate-user-guide.md](docs/boilerplate-user-guide.md)
* **Auth System Design**: [docs/superpowers/specs/2026-06-18-nextsaas-auth-design.md](docs/superpowers/specs/2026-06-18-nextsaas-auth-design.md)
* **Organizations Specification**: [docs/superpowers/specs/2026-06-18-nextsaas-orgs-design.md](docs/superpowers/specs/2026-06-18-nextsaas-orgs-design.md)
* **OAuth Setup Spec**: [docs/superpowers/specs/2026-06-19-nextsaas-oauth-design.md](docs/superpowers/specs/2026-06-19-nextsaas-oauth-design.md)
