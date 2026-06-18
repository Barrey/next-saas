import { mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core";
import crypto from "crypto";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
