import { pgTable, uuid, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  twoFactorSecret: varchar("two_factor_secret", { length: 255 }),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  suspended: boolean("suspended").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 512 }),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const verificationTokens = pgTable("verification_tokens", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'magic_link' | 'password_reset' | 'email_verification'
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
