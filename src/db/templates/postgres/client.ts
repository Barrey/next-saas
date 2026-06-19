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
  const mockOrgs: any[] = (globalThis as any).mockOrgs || [];

  (globalThis as any).mockUsers = mockUsers;
  (globalThis as any).mockSessions = mockSessions;
  (globalThis as any).mockTokens = mockTokens;
  (globalThis as any).mockOrgs = mockOrgs;

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
        two_factor_secret: null,
        two_factor_enabled: false,
        failed_login_attempts: 0,
        locked_until: null,
        suspended: false,
        organization_id: params[2] || null,
        role: params[3] || null,
        created_at: new Date()
      };
      mockUsers.push(user);
      return mockQueryResult([user]);
    }

    // 4. UPDATE user
    if (sql.includes('update "users"')) {
      const targetId = params[params.length - 1];
      const user = mockUsers.find(u => u.id === targetId);
      if (user) {
        const setMatches = sql.matchAll(/"([^"]+)"\s*=\s*\$(\d+)/g);
        for (const match of setMatches) {
          const col = match[1];
          const paramIdx = parseInt(match[2], 10) - 1;
          const val = params[paramIdx];
          if (col === 'failed_login_attempts') user.failed_login_attempts = val;
          else if (col === 'locked_until') user.locked_until = val;
          else if (col === 'organization_id') user.organization_id = val;
          else if (col === 'role') user.role = val;
          else if (col === 'two_factor_secret') user.two_factor_secret = val;
          else if (col === 'two_factor_enabled') user.two_factor_enabled = val;
          else if (col === 'password_hash') user.password_hash = val;
        }
        if (sql.includes('"failed_login_attempts" = 0')) {
          user.failed_login_attempts = 0;
          user.locked_until = null;
        }
      }
      return mockQueryResult(user ? [user] : []);
    }

    // 5. INSERT organization
    if (sql.includes('insert into "organizations"')) {
      const match = sql.match(/insert into "organizations" \((.+?)\)/i);
      const cols = match ? match[1].split(',').map((c: string) => c.trim().replace(/"/g, '')) : ['id', 'name'];
      const org: any = {
        id: crypto.randomUUID(),
        name: '',
        invitation_expiry_days: null,
        created_at: new Date()
      };
      cols.forEach((col: string, idx: number) => {
        const val = params[idx];
        if (col === 'id') org.id = val;
        else if (col === 'name') org.name = val;
        else if (col === 'invitation_expiry_days') org.invitation_expiry_days = val;
        else if (col === 'created_at') org.created_at = val;
      });
      mockOrgs.push(org);
      return mockQueryResult([org]);
    }

    // 5b. SELECT organization by id
    if (sql.includes('from "organizations"') && sql.includes('"organizations"."id" = $1')) {
      const id = params[0];
      const org = mockOrgs.find(o => o.id === id);
      return mockQueryResult(org ? [org] : []);
    }

    // 5c. UPDATE organization
    if (sql.includes('update "organizations"')) {
      const targetId = params[params.length - 1];
      const org = mockOrgs.find(o => o.id === targetId);
      if (org) {
        const setMatches = sql.matchAll(/"([^"]+)"\s*=\s*\$(\d+)/g);
        for (const match of setMatches) {
          const col = match[1];
          const paramIdx = parseInt(match[2], 10) - 1;
          const val = params[paramIdx];
          if (col === 'name') org.name = val;
          else if (col === 'invitation_expiry_days') org.invitation_expiry_days = val;
        }
      }
      return mockQueryResult(org ? [org] : []);
    }

    // 5d. INSERT invitation
    if (sql.includes('insert into "invitations"')) {
      const match = sql.match(/insert into "invitations" \((.+?)\)/i);
      const cols = match ? match[1].split(',').map((c: string) => c.trim().replace(/"/g, '')) : [];
      const invite: any = {
        id: '',
        email: '',
        organization_id: '',
        status: 'pending',
        expires_at: new Date(),
        created_at: new Date()
      };
      cols.forEach((col: string, idx: number) => {
        const val = params[idx];
        if (col === 'id') invite.id = val;
        else if (col === 'email') invite.email = val;
        else if (col === 'organization_id') invite.organization_id = val;
        else if (col === 'status') invite.status = val;
        else if (col.endsWith('_at') || col.endsWith('_until')) {
          invite[col] = (typeof val === 'string' || typeof val === 'number') ? new Date(val) : val;
        }
      });
      console.log("[Mock DB] INSERT invitation:", invite);
      mockTokens.push(invite);
      return mockQueryResult([invite]);
    }

    // 5e. SELECT invitation by id
    if (sql.includes('from "invitations"') && sql.includes('"invitations"."id" = $1')) {
      console.log("[Mock DB] SELECT invitation by id search:", params[0]);
      const invite = mockTokens.find(t => t.id === params[0] && t.organization_id !== undefined);
      console.log("[Mock DB] SELECT invitation found:", invite);
      return mockQueryResult(invite ? [invite] : []);
    }

    // 5f. UPDATE invitation status
    if (sql.includes('update "invitations"')) {
      const targetId = params[params.length - 1];
      console.log("[Mock DB] UPDATE invitation search status:", params[0], "target:", targetId);
      const invite = mockTokens.find(t => t.id === targetId && t.organization_id !== undefined);
      if (invite) {
        invite.status = params[0];
        console.log("[Mock DB] UPDATE invitation success, new status:", invite.status);
      } else {
        console.log("[Mock DB] UPDATE invitation failed - not found");
      }
      return mockQueryResult(invite ? [invite] : []);
    }

    // 6. INSERT session
    if (sql.includes('insert into "sessions"')) {
      const session = {
        id: params[0],
        user_id: params[1],
        expires_at: (typeof params[2] === 'string' || typeof params[2] === 'number') ? new Date(params[2]) : params[2],
        ip_address: params[3],
        user_agent: params[4],
        created_at: (typeof params[5] === 'string' || typeof params[5] === 'number') ? new Date(params[5]) : (params[5] || new Date())
      };
      mockSessions.push(session);
      return mockQueryResult([session]);
    }

    // 7. SELECT session JOIN user
    if (sql.includes('from "sessions"') && sql.includes('inner join "users"')) {
      const hashedToken = params[0];
      const session = mockSessions.find(s => s.id === hashedToken);
      const user = session ? mockUsers.find(u => u.id === session.user_id) : null;
      if (session && user) {
        const match = sql.match(/select\s+(.+?)\s+from/i);
        if (match) {
          const cols = match[1].split(',').map((c: string) => c.trim().replace(/"/g, ''));
          const rowData = cols.map((col: string) => {
            const [table, field] = col.split('.');
            if (table === 'sessions') {
              return session[field];
            } else if (table === 'users') {
              return user[field];
            }
            return null;
          });
          return { rows: [rowData], fields: cols.map((c: string) => ({ name: c.split('.')[1] })) };
        }
      }
      return mockQueryResult([]);
    }

    // 8. DELETE session
    if (sql.includes('delete from "sessions"')) {
      const hashedToken = params[0];
      const idx = mockSessions.findIndex(s => s.id === hashedToken);
      if (idx !== -1) mockSessions.splice(idx, 1);
      return mockQueryResult([]);
    }

    // 9. SELECT verification token
    if (sql.includes('from "verification_tokens"')) {
      const hashedToken = params[0];
      const token = mockTokens.find(t => t.id === hashedToken);
      return mockQueryResult(token ? [token] : []);
    }

    // 10. INSERT verification token
    if (sql.includes('insert into "verification_tokens"')) {
      const token = {
        id: params[0],
        user_id: params[1],
        type: params[2],
        expires_at: (typeof params[3] === 'string' || typeof params[3] === 'number') ? new Date(params[3]) : params[3],
        created_at: (typeof params[4] === 'string' || typeof params[4] === 'number') ? new Date(params[4]) : (params[4] || new Date())
      };
      mockTokens.push(token);
      return mockQueryResult([token]);
    }

    // 11. DELETE verification token
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
