import 'dotenv/config';
import { Pool } from 'pg';
import type { QueryResult } from 'pg';

let realPool: Pool | null = null;

export function getPool(): Pool | null {
  const connStr = process.env.DATABASE_URL?.trim();
  if (!connStr) return null;

  if (!realPool) {
    try {
      realPool = new Pool({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 8000,
      });

      realPool.on('error', (err) => {
        console.warn('[PostgreSQL] Idle client warning:', err.message);
      });
    } catch (err) {
      console.warn('[PostgreSQL] Could not initialize pool — using fallback:', err);
      realPool = null;
    }
  }
  return realPool;
}

// Mock interface for offline/fallback environment
const mockPool = {
  query: async <T = any>(_text: string, _params?: any[]): Promise<QueryResult<T>> => {
    return { rows: [], command: '', rowCount: 0, oid: 0, fields: [] } as QueryResult<T>;
  },
  connect: async () => ({
    query: async <T = any>(_text: string, _params?: any[]): Promise<QueryResult<T>> => {
      return { rows: [], command: '', rowCount: 0, oid: 0, fields: [] } as QueryResult<T>;
    },
    release: () => {},
  }),
  on: () => {},
};

export const pgPool = new Proxy({} as Pool, {
  get(_target, prop) {
    const active = getPool();
    if (active) {
      const val = (active as any)[prop];
      return typeof val === 'function' ? val.bind(active) : val;
    }
    const fallback = mockPool as any;
    return typeof fallback[prop] === 'function' ? fallback[prop].bind(mockPool) : fallback[prop];
  }
});

export async function pgQuery<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const pool = getPool();
  if (!pool) {
    return { rows: [], command: '', rowCount: 0, oid: 0, fields: [] } as QueryResult<T>;
  }
  return await pool.query<T>(text, params);
}

export async function testPgConnection(): Promise<boolean> {
  const pool = getPool();
  if (!pool) {
    return false;
  }
  try {
    const res = await Promise.race([
      pool.query('SELECT NOW() AS server_time'),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 6000)),
    ]);
    console.log('[PostgreSQL] Connected to Neon DB successfully at:', (res as any).rows[0]?.server_time);
    return true;
  } catch (err: any) {
    console.warn('[PostgreSQL] Connection check failed:', err.message || err);
    return false;
  }
}

// Helper to retry operations on transient concurrency issues like deadlocks (Postgres error 40P01)
async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastErr: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const isDeadlock = err?.code === '40P01' || err?.message?.toLowerCase().includes('deadlock');
      if (isDeadlock && attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, 50 * attempt + Math.floor(Math.random() * 80)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// Utility to safely insert or update PostgreSQL records
export async function syncTableToPostgres(tableName: string, records: any[]): Promise<void> {
  const pool = getPool();
  if (!pool || !records || records.length === 0) return;

  // Enforce deterministic lock ordering: sort records ascending by ID to prevent circular deadlock wait-chains
  const sortedRecords = [...records]
    .filter((r) => r && typeof r === 'object' && r.id !== undefined)
    .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));

  if (sortedRecords.length === 0) return;
  const isAppendOnly = tableName === 'audit_logs';

  try {
    await executeWithRetry(async () => {
      let client;
      try {
        client = await pool.connect();
        await client.query('BEGIN');
        await client.query("SET LOCAL lock_timeout = '4s'");

        for (const record of sortedRecords) {
          const keys = Object.keys(record);
          if (keys.length === 0) continue;

          const values = keys.map((k) => {
            const v = record[k];
            if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
              return JSON.stringify(v);
            }
            return v;
          });

          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const quotedKeys = keys.map((k) => `"${k}"`).join(', ');

          let sql = `INSERT INTO "${tableName}" (${quotedKeys}) VALUES (${placeholders})`;

          if (keys.includes('id')) {
            if (isAppendOnly) {
              sql += ` ON CONFLICT ("id") DO NOTHING`;
            } else {
              const updateSet = keys
                .filter((k) => k !== 'id')
                .map((k) => `"${k}" = EXCLUDED."${k}"`)
                .join(', ');

              if (updateSet.length > 0) {
                sql += ` ON CONFLICT ("id") DO UPDATE SET ${updateSet}`;
              } else {
                sql += ` ON CONFLICT ("id") DO NOTHING`;
              }
            }
          }

          await client.query(sql, values);
        }

        await client.query('COMMIT');
      } catch (err: any) {
        if (client) {
          try {
            await client.query('ROLLBACK');
          } catch {}
        }
        throw err;
      } finally {
        if (client) {
          client.release();
        }
      }
    });
  } catch (err: any) {
    console.warn(`[PostgreSQL] Failed syncing table ${tableName}:`, err?.message || err);
  }
}

export async function syncSingleRecordToPostgres(tableName: string, record: any): Promise<void> {
  const pool = getPool();
  if (!pool || !record || typeof record !== 'object') return;
  try {
    await executeWithRetry(async () => {
      const keys = Object.keys(record);
      if (keys.length === 0) return;

      const values = keys.map((k) => {
        const v = record[k];
        if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
          return JSON.stringify(v);
        }
        return v;
      });

      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const quotedKeys = keys.map((k) => `"${k}"`).join(', ');

      let sql = `INSERT INTO "${tableName}" (${quotedKeys}) VALUES (${placeholders})`;

      if (keys.includes('id')) {
        if (tableName === 'audit_logs') {
          sql += ` ON CONFLICT ("id") DO NOTHING`;
        } else {
          const updateSet = keys
            .filter((k) => k !== 'id')
            .map((k) => `"${k}" = EXCLUDED."${k}"`)
            .join(', ');

          if (updateSet.length > 0) {
            sql += ` ON CONFLICT ("id") DO UPDATE SET ${updateSet}`;
          } else {
            sql += ` ON CONFLICT ("id") DO NOTHING`;
          }
        }
      }

      await pool.query(sql, values);
    });
  } catch (err: any) {
    console.warn(`[PostgreSQL] Failed upserting single record to ${tableName}:`, err?.message || err);
  }
}

export async function deleteRecordFromPostgres(tableName: string, id: number): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(`DELETE FROM "${tableName}" WHERE "id" = $1`, [id]);
  } catch (err: any) {
    console.warn(`[PostgreSQL] Failed deleting record ${id} from ${tableName}:`, err?.message || err);
  }
}
