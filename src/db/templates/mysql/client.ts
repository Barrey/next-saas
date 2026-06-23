import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import crypto from "crypto";
import * as schema from "./schema";

const isMock = process.env.MOCK_DB === "true";

let dbInstance: any;

if (isMock) {
  console.log("[Database] Running with in-memory Mock Database (MySQL)");
  
  const mockUsers: any[] = (globalThis as any).mockUsers || [];
  const mockSessions: any[] = (globalThis as any).mockSessions || [];
  const mockTokens: any[] = (globalThis as any).mockTokens || [];
  const mockOrgs: any[] = (globalThis as any).mockOrgs || [];

  (globalThis as any).mockUsers = mockUsers;
  (globalThis as any).mockSessions = mockSessions;
  (globalThis as any).mockTokens = mockTokens;
  (globalThis as any).mockOrgs = mockOrgs;

  const mockQueryResult = (rows: any[]) => {
    const fields = rows.length > 0 ? Object.keys(rows[0]).map(key => ({ name: key })) : [];
    return [rows, fields];
  };

  const mockConnection = {
    execute: async (sql: string, params: any[] = []) => {
      return mockQuery(sql, params);
    },
    query: async (sql: string, params: any[] = []) => {
      return mockQuery(sql, params);
    }
  };

  async function mockQuery(sql: string, params: any[]) {
    // 1. SELECT users by email
    if (sql.includes('from `users`') && sql.includes('`email` = ?')) {
      const email = params[0];
      const user = mockUsers.find(u => u.email === email);
      return mockQueryResult(user ? [user] : []);
    }

    // 2. SELECT users by id
    if (sql.includes('from `users`') && sql.includes('`id` = ?')) {
      const id = params[0];
      const user = mockUsers.find(u => u.id === id);
      return mockQueryResult(user ? [user] : []);
    }

    // 3. INSERT user
    if (sql.includes('insert into `users`')) {
      const match = sql.match(/insert into `users` \((.+?)\) values \((.+?)\)/i);
      const cols = match ? match[1].split(',').map((c: string) => c.trim().replace(/`/g, '')) : [];
      const vals = match ? match[2].split(',').map((v: string) => v.trim()) : [];
      const user: any = {
        id: crypto.randomUUID(),
        email: '',
        password_hash: null,
        google_id: null,
        github_id: null,
        facebook_id: null,
        two_factor_secret: null,
        two_factor_enabled: false,
        failed_login_attempts: 0,
        locked_until: null,
        suspended: false,
        organization_id: null,
        role: null,
        created_at: new Date()
      };
      let paramIdx = 0;
      cols.forEach((col: string, idx: number) => {
        const valStr = vals[idx];
        if (valStr === '?') {
          const val = params[paramIdx++];
          if (col === 'id') user.id = val;
          else if (col === 'email') user.email = val;
          else if (col === 'password_hash') user.password_hash = val;
          else if (col === 'google_id') user.google_id = val;
          else if (col === 'github_id') user.github_id = val;
          else if (col === 'facebook_id') user.facebook_id = val;
          else if (col === 'two_factor_secret') user.two_factor_secret = val;
          else if (col === 'two_factor_enabled') user.two_factor_enabled = val === true || val === 1;
          else if (col === 'failed_login_attempts') user.failed_login_attempts = val;
          else if (col === 'locked_until') user.locked_until = val;
          else if (col === 'suspended') user.suspended = val === true || val === 1;
          else if (col === 'organization_id') user.organization_id = val;
          else if (col === 'role') user.role = val;
          else if (col === 'created_at') user.created_at = val;
        }
      });
      mockUsers.push(user);
      return mockQueryResult([user]);
    }

    // 4. UPDATE user
    if (sql.includes('update `users`')) {
      const targetId = params[params.length - 1];
      const user = mockUsers.find(u => u.id === targetId);
      if (user) {
        const setMatches = sql.matchAll(/`([^`]+)`\s*=\s*\?/g);
        let idx = 0;
        for (const match of setMatches) {
          const col = match[1];
          const val = params[idx++];
          if (col === 'failed_login_attempts') user.failed_login_attempts = val;
          else if (col === 'locked_until') user.locked_until = val;
          else if (col === 'organization_id') user.organization_id = val;
          else if (col === 'role') user.role = val;
          else if (col === 'two_factor_secret') user.two_factor_secret = val;
          else if (col === 'two_factor_enabled') user.two_factor_enabled = val === true || val === 1;
          else if (col === 'password_hash') user.password_hash = val;
          else if (col === 'google_id') user.google_id = val;
          else if (col === 'github_id') user.github_id = val;
          else if (col === 'facebook_id') user.facebook_id = val;
        }
        if (sql.includes('`failed_login_attempts` = 0')) {
          user.failed_login_attempts = 0;
          user.locked_until = null;
        }
      }
      return mockQueryResult(user ? [user] : []);
    }

    // 5. INSERT organization
    if (sql.includes('insert into `organizations`')) {
      const match = sql.match(/insert into `organizations` \((.+?)\)/i);
      const cols = match ? match[1].split(',').map((c: string) => c.trim().replace(/`/g, '')) : ['id', 'name'];
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
    if (sql.includes('from `organizations`') && sql.includes('`id` = ?')) {
      const id = params[0];
      const org = mockOrgs.find(o => o.id === id);
      return mockQueryResult(org ? [org] : []);
    }

    // 5c. UPDATE organization
    if (sql.includes('update `organizations`')) {
      const targetId = params[params.length - 1];
      const org = mockOrgs.find(o => o.id === targetId);
      if (org) {
        const setMatches = sql.matchAll(/`([^`]+)`\s*=\s*\?/g);
        let idx = 0;
        for (const match of setMatches) {
          const col = match[1];
          const val = params[idx++];
          if (col === 'name') org.name = val;
          else if (col === 'invitation_expiry_days') org.invitation_expiry_days = val;
        }
      }
      return mockQueryResult(org ? [org] : []);
    }

    // 5d. INSERT invitation
    if (sql.includes('insert into `invitations`')) {
      const match = sql.match(/insert into `invitations` \((.+?)\)/i);
      const cols = match ? match[1].split(',').map((c: string) => c.trim().replace(/`/g, '')) : [];
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
      mockTokens.push(invite);
      return mockQueryResult([invite]);
    }

    // 5e. SELECT invitation by id
    if (sql.includes('from `invitations`') && sql.includes('`id` = ?')) {
      const invite = mockTokens.find(t => t.id === params[0] && t.organization_id !== undefined);
      return mockQueryResult(invite ? [invite] : []);
    }

    // 5f. UPDATE invitation status
    if (sql.includes('update `invitations`')) {
      const targetId = params[params.length - 1];
      const invite = mockTokens.find(t => t.id === targetId && t.organization_id !== undefined);
      if (invite) {
        invite.status = params[0];
      }
      return mockQueryResult(invite ? [invite] : []);
    }

    // 5. INSERT session
    if (sql.includes('insert into `sessions`')) {
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

    // 6. SELECT session JOIN user
    if (sql.includes('from `sessions`') && sql.includes('inner join `users`')) {
      const hashedToken = params[0];
      const session = mockSessions.find(s => s.id === hashedToken);
      const user = session ? mockUsers.find(u => u.id === session.user_id) : null;
      if (session && user) {
        const match = sql.match(/select\s+(.+?)\s+from/i);
        if (match) {
          const cols = match[1].split(',').map((c: string) => c.trim().replace(/`/g, ''));
          const rowData = cols.map((col: string) => {
            const [table, field] = col.split('.');
            if (table === 'sessions') {
              return session[field];
            } else if (table === 'users') {
              return user[field];
            }
            return null;
          });
          return [[rowData], cols.map((c: string) => ({ name: c.split('.')[1] }))];
        }
      }
      return mockQueryResult([]);
    }

    // 7. DELETE session
    if (sql.includes('delete from `sessions`')) {
      const hashedToken = params[0];
      const idx = mockSessions.findIndex(s => s.id === hashedToken);
      if (idx !== -1) mockSessions.splice(idx, 1);
      return mockQueryResult([]);
    }

    // 8. SELECT verification token
    if (sql.includes('from `verification_tokens`')) {
      const hashedToken = params[0];
      const token = mockTokens.find(t => t.id === hashedToken);
      return mockQueryResult(token ? [token] : []);
    }

    // 9. INSERT verification token
    if (sql.includes('insert into `verification_tokens`')) {
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

    // 10. DELETE verification token
    if (sql.includes('delete from `verification_tokens`')) {
      const hashedToken = params[0];
      const idx = mockTokens.findIndex(t => t.id === hashedToken);
      if (idx !== -1) mockTokens.splice(idx, 1);
      return mockQueryResult([]);
    }

    return mockQueryResult([]);
  }

  dbInstance = drizzle(mockConnection as any, { schema });
} else {
  const connection = await mysql.createConnection(process.env.DATABASE_URL || "");
  dbInstance = drizzle(connection, { schema });
}

export const db = dbInstance;
