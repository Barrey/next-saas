# Design Specification: NextSaas Organizations, Roles & Invitations (Phase 3)

* **Date**: 2026-06-18
* **Topic**: Multi-Tenancy Workspaces, Roles & Invitation Workflows (Phase 3)
* **Status**: Approved by User

---

## 1. Goal & Context
The goal is to implement a team subscription system. Users belong to exactly one organization at a time (One-to-Many). Creating an organization grants the user the `'owner'` role. Users can invite others to join their team via secure pending invitation tokens, assigning them the `'member'` role upon acceptance.

---

## 2. Database Schema Specifications
All database dialects (PostgreSQL, MySQL, MariaDB) will be updated under their respective `src/db/templates/` directories.

### 2.1 `organizations` Table
* `id` (UUID / String length 36): Primary Key.
* `name` (Varchar 255): Not null.
* `createdAt` (Timestamp): Defaults to now.

### 2.2 Modified `users` Table (Additions)
* `organizationId` (UUID / String length 36): Nullable foreign key pointing to `organizations.id` (on delete set null).
* `role` (Varchar 50): Nullable. Restricted to `'owner' | 'member'`.

### 2.3 `invitations` Table
* `id` (Varchar 64): SHA-256 hash of the invitation token. Primary Key.
* `email` (Varchar 255): Not null, recipient email address.
* `organizationId` (UUID / String length 36): Foreign key pointing to `organizations.id` (on delete cascade).
* `status` (Varchar 50): Defaults to `'pending'` (values: `'pending' | 'accepted' | 'declined'`).
* `expiresAt` (Timestamp): Not null.
* `createdAt` (Timestamp): Defaults to now.

---

## 3. Configuration & Expiry
We centralize configurations inside `src/lib/config.ts` to easily override authentication and workspace parameters.

### Centralized Config File (`src/lib/config.ts`)
```typescript
export const AUTH_CONFIG = {
  // Expiry time for workspace invitations (in days, defaults to 7)
  invitationExpiryDays: Number(process.env.INVITATION_EXPIRY_DAYS) || 7,
};
```
Calculations for expiry:
`const expiresAt = new Date(Date.now() + AUTH_CONFIG.invitationExpiryDays * 24 * 60 * 60 * 1000);`

---

## 4. Workflows

### 4.1 Team Creation (`POST /api/auth/organization`)
1. User must be authenticated.
2. Verify `user.organizationId` is null. If not null $\rightarrow$ deny access.
3. Insert new row into `organizations`.
4. Update user record: set `organizationId = org.id`, `role = 'owner'`.

### 4.2 Member Invitations (`POST /api/auth/organization/invite`)
1. User must be authenticated.
2. Verify `user.role === 'owner'`. If not $\rightarrow$ deny access.
3. Generate secure random 32-byte token.
4. Store SHA-256 hash of token in `invitations` with status `'pending'`.
5. Return invitation link: `/api/invitations/accept?token=RAW_TOKEN`.

### 4.3 Accepting Invitations (`GET /api/invitations/accept?token=RAW_TOKEN`)
1. Retrieve token query parameter $\rightarrow$ hash using SHA-256 $\rightarrow$ query `invitations`.
2. Verify invite exists, status is `'pending'`, and `now < expiresAt`. If invalid $\rightarrow$ redirect to login with error.
3. Retrieve active user.
   - **If logged in**:
     - Check `user.role === 'owner'`. If yes $\rightarrow$ block invitation acceptance (must delete/transfer current workspace first).
     - Update user record: set `organizationId` to the invite's `organizationId`, and `role = 'member'`.
     - Update invitation status to `'accepted'`.
     - Redirect to `/dashboard`.
   - **If not logged in**:
     - Redirect to `/register?invite_token=RAW_TOKEN` to complete onboarding first, auto-applying membership upon registration completion.

---

## 5. Access Control Guards
- **`requireOrgMember()`**: Guard checking that the user is logged in and belongs to an organization.
- **`requireOwner()`**: Guard checking that the user is logged in, belongs to an organization, and has `role === 'owner'`.

---

## 6. Verification Plan
1. **Database Schema updates**: Ensure tables and column relationships load cleanly in the mock context.
2. **Access Guards unit checks**: Verify redirect actions and return codes for members vs owners.
3. **Integration tests**: Playwright checks running:
   - Creating a team.
   - Restricting standard members from generating invites.
   - Creating, sending, and accepting invitations successfully.
   - Blocking invite acceptance if user is already an Owner of another team.
