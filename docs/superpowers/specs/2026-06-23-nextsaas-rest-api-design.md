# Design Specification: REST API & API Key Authentication (Phase 9)

* **Date**: 2026-06-23
* **Topic**: REST API, Hashed API Keys, Organization Context & Rate Limiting
* **Status**: Proposed

---

## 1. Goal & Context

The goal is to implement a secure REST API for external integrations on top of the `NextSaas` multi-tenant boilerplate. To authorize external scripts, the template will support **Hashed API Key Authentication**. Organization owners will be able to manage their organization's API keys directly from a new settings page, while external requests will carry these keys in an `Authorization` header to access core tenant and member operations.

---

## 2. Database Schema Expansion

To track active keys, a new `api_keys` relation will be created in all supported database dialects:

### 2.1 Schema Tables
* **Postgres** (`src/db/templates/postgres/schema.ts`):
  ```typescript
  export const apiKeys = pgTable("api_keys", {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    keyHash: varchar("key_hash", { length: 255 }).notNull().unique(),
    truncatedKey: varchar("truncated_key", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at")
  });
  ```
* **MySQL & MariaDB** (`src/db/templates/mysql/schema.ts` & `src/db/templates/mariadb/schema.ts`):
  ```typescript
  export const apiKeys = mysqlTable("api_keys", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: varchar("organization_id", { length: 36 }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    keyHash: varchar("key_hash", { length: 255 }).notNull().unique(),
    truncatedKey: varchar("truncated_key", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at")
  });
  ```

### 2.2 Client Intercept Mocks
The database driver mocks in `src/db/templates/mysql/client.ts` and `src/db/templates/mariadb/client.ts` will support:
* `SELECT FROM api_keys`
* `INSERT INTO api_keys`
* `DELETE FROM api_keys`
* `UPDATE api_keys` (setting `lastUsedAt`)

---

## 3. Cryptography & Key Management

API key strings are generated and stored securely:
* **Generation**: A cryptographically random secret string of 32 characters, formatted as `sk_live_<random_hex>`.
* **Truncated Representation**: For security audits and display tables, keys are stored and rendered as `sk_live_***<last 4 characters>` (e.g. `sk_live_***9e4f`).
* **Hashing**: The raw secret is hashed using `SHA-256` before database storage.
* **UI Lifecycle**:
  * Users name the key and click "Generate".
  * The server returns the raw key `sk_live_...` exactly once in the response.
  * The frontend displays it in a copyable alert box with a prominent warning message.
  * Future lists show only the truncated key string, creation date, and last used timestamp.

---

## 4. Authentication Guard & Rate Limiting

### 4.1 API Key Verification Helper (`src/lib/auth/api-guard.ts`)
* Ingests the standard `Authorization: Bearer <key>` header from requests.
* Hashes the raw bearer key with `SHA-256`.
* Looks up the matching hash in `api_keys` inner joined with `organizations`.
* Updates the key's `lastUsedAt` asynchronously in the background.
* Returns the validated `organization` record.

### 4.2 In-Memory API Rate Limiter (`src/lib/auth/rate-limiter.ts`)
* A sliding-window count mapped to the active `organizationId`.
* Enforces a default request throttling limit of **60 requests per minute**.
* Returns a `429 Too Many Requests` response wrapper when limits are exceeded.

---

## 5. REST API Endpoints

The API routes fall under the `/api/v1/` prefix:
* **GET `/api/v1/org`**:
  * Validates the request API key.
  * Returns the associated organization details (`id`, `name`, `createdAt`, `invitationExpiryDays`).
* **GET `/api/v1/org/members`**:
  * Validates the request API key.
  * Queries and lists registered users within the organization (`id`, `email`, `role`, `createdAt`).
* **POST `/api/v1/org/invitations`**:
  * Validates the request API key.
  * Validates request body contains `{ email: string }`.
  * Generates an invitation token, hashes it, inserts it into the database, and returns the invitation context and token URL parameter.

---

## 6. Settings Page & UI Integration

The API Key administration settings will be placed inside the standard layout path `/settings/api-keys`:
* **Sidebar Menu Update**: A new `API Keys` link will be appended to the settings layout wrapper `src/components/settings/settings-sidebar.tsx`, visible only to organization `Owner`s.
* **Security Middleware Protection**: Unauthenticated users or non-owner members trying to access `/settings/api-keys` are redirected to security settings or login views.
* **React Client Component** (`ApiKeysManagerClient.tsx`):
  * Handles the state management of existing keys.
  * Displays truncated keys, creation dates, and last used times in a clean, modern list layout.
  * Displays the copyable new API Key output container on success.
  * Triggers DELETE requests to `/api/settings/api-keys/revoke` to invalidate specific keys.

---

## 7. Verification Plan

### 7.1 Automated Integration Tests (`tests/integration/rest-api.spec.ts`)
* **Unauthenticated Access**: Verify requests without bearer tokens or with invalid keys receive a `401 Unauthorized` response.
* **Authorized Retrieval**: Verify a valid API key correctly fetches organization info via `/api/v1/org` and member lists via `/api/v1/org/members`.
* **Programmatic Invitation**: Verify POST requests to `/api/v1/org/invitations` create a pending token in the database.
* **Rate Limiting**: Simulate multiple quick request calls to verify the `429 Too Many Requests` code triggers after 60 calls.
* **UI Controls**: Use Playwright tests to verify that owners can navigate to the API Keys tab, generate keys, copy raw keys, see truncated strings, and revoke them successfully.

### 7.2 Compilation & Build Baseline
* Execute `npm run build` to confirm compiling and routes definition work successfully.
