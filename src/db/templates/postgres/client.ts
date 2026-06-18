import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import crypto from "crypto";
import * as schema from "./schema";

const isMock = process.env.MOCK_DB === "true";

let dbInstance: any;

if (isMock) {
  console.log("[Database] Running with in-memory Mock Database");
  
  // Persist mock data on globalThis to survive Next.js HMR/compilation reloads
  const mockUsers: any[] = (globalThis as any).mockUsers || [];
  const mockSessions: any[] = (globalThis as any).mockSessions || [];
  const mockTokens: any[] = (globalThis as any).mockTokens || [];

  (globalThis as any).mockUsers = mockUsers;
  (globalThis as any).mockSessions = mockSessions;
  (globalThis as any).mockTokens = mockTokens;

  const mockPool = {
    connect: async () => {
      return {
        query: async (sql: any, params?: any[]) => {
          return mockQuery(sql, params);
        },
        release: () => {}
      };
    },
    query: async (sql: any, params?: any[]) => {
      return mockQuery(sql, params);
    },
    on: () => {}
  };

  function mockQueryResult(rows: any[]) {
    if (rows.length === 0) {
      return { rows: [], fields: [] };
    }
    const keys = Object.keys(rows[0]);
    const fields = keys.map(key => ({ name: key }));
    const arrayRows = rows.map(row => keys.map(key => row[key]));
    return { rows: arrayRows, fields };
  }

  async function mockQuery(queryTextOrConfig: any, values?: any[]) {
    const sql = typeof queryTextOrConfig === "string" ? queryTextOrConfig : queryTextOrConfig.text;
    const params = values || queryTextOrConfig.values || [];

    // 1. SELECT users by email
    if (sql.includes('from "users"') && sql.includes('"users"."email" = $1')) {
      const email = params[0];
      const user = mockUsers.find(u => u.email === email);
      return mockQueryResult(user ? [user] : []);
    }

    // 2. SELECT users by id
    if (sql.includes('from "users"') && sql.includes('"users"."id" = $1')) {
      const id = params[0];
      const user = mockUsers.find(u => u.id === id);
      return mockQueryResult(user ? [user] : []);
    }

    // 3. INSERT user
    if (sql.includes('insert into "users"')) {
      const user = {
        id: crypto.randomUUID(),
        email: params[0],
        password_hash: params[1],
        two_factor_secret: params[2] || null,
        two_factor_enabled: params[3] === true || params[3] === 1 || false,
        failed_login_attempts: params[4] || 0,
        locked_until: params[5] || null,
        suspended: params[6] || false,
        created_at: params[7] || new Date()
      };
      mockUsers.push(user);
      return mockQueryResult([user]);
    }

    // 4. UPDATE user
    if (sql.includes('update "users"')) {
      const targetId = params[params.length - 1];
      const user = mockUsers.find(u => u.id === targetId);
      if (user) {
        if (sql.includes('"failed_login_attempts" = $1')) {
          user.failed_login_attempts = params[0];
        }
        if (sql.includes('"locked_until" = $2')) {
          user.locked_until = params[1];
        }
        if (sql.includes('"failed_login_attempts" = 0')) {
          user.failed_login_attempts = 0;
          user.locked_until = null;
        }
      }
      return mockQueryResult(user ? [user] : []);
    }

    // 5. INSERT session
    if (sql.includes('insert into "sessions"')) {
      const session = {
        id: params[0],
        user_id: params[1],
        expires_at: params[2],
        ip_address: params[3],
        user_agent: params[4],
        created_at: params[5] || new Date()
      };
      mockSessions.push(session);
      return mockQueryResult([session]);
    }

    // 6. SELECT session JOIN user
    if (sql.includes('from "sessions"') && sql.includes('inner join "users"')) {
      const hashedToken = params[0];
      const session = mockSessions.find(s => s.id === hashedToken);
      const user = session ? mockUsers.find(u => u.id === session.user_id) : null;
      if (session && user) {
        return mockQueryResult([
          {
            id: session.id,
            user_id: session.user_id,
            expires_at: session.expires_at,
            ip_address: session.ip_address,
            user_agent: session.user_agent,
            created_at: session.created_at,
            email: user.email,
            password_hash: user.password_hash,
            two_factor_secret: user.two_factor_secret,
            two_factor_enabled: user.two_factor_enabled,
            failed_login_attempts: user.failed_login_attempts,
            locked_until: user.locked_until,
            suspended: user.suspended
          }
        ]);
      }
      return mockQueryResult([]);
    }

    // 7. DELETE session
    if (sql.includes('delete from "sessions"')) {
      const hashedToken = params[0];
      const idx = mockSessions.findIndex(s => s.id === hashedToken);
      if (idx !== -1) mockSessions.splice(idx, 1);
      return mockQueryResult([]);
    }

    // 8. SELECT verification token
    if (sql.includes('from "verification_tokens"')) {
      const hashedToken = params[0];
      const token = mockTokens.find(t => t.id === hashedToken);
      return mockQueryResult(token ? [token] : []);
    }

    // 9. INSERT verification token
    if (sql.includes('insert into "verification_tokens"')) {
      const token = {
        id: params[0],
        user_id: params[1],
        type: params[2],
        expires_at: params[3],
        created_at: params[4] || new Date()
      };
      mockTokens.push(token);
      return mockQueryResult([token]);
    }

    // 10. DELETE verification token
    if (sql.includes('delete from "verification_tokens"')) {
      const hashedToken = params[0];
      const idx = mockTokens.findIndex(t => t.id === hashedToken);
      if (idx !== -1) mockTokens.splice(idx, 1);
      return mockQueryResult([]);
    }

    return mockQueryResult([]);
  }

  dbInstance = drizzle(mockPool as any, { schema });
} else {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  dbInstance = drizzle(pool, { schema });
}

export const db = dbInstance;
