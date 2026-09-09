import 'dotenv/config';
import { Pool, QueryResult } from 'pg';

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

// Utility to safely insert or update PostgreSQL records
export async function syncTableToPostgres(tableName: string, records: any[]): Promise<void> {
  const pool = getPool();
  if (!pool || !records || records.length === 0) return;
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    for (const record of records) {
      const keys = Object.keys(record);
      if (keys.length === 0) continue;

      const values = keys.map(k => {
        const v = record[k];
        if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
          return JSON.stringify(v);
        }
        return v;
      });

      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const updateSet = keys
        .filter(k => k !== 'id')
        .map((k) => `"${k}" = EXCLUDED."${k}"`)
        .join(', ');

      const quotedKeys = keys.map(k => `"${k}"`).join(', ');

      let sql = `
        INSERT INTO "${tableName}" (${quotedKeys})
        VALUES (${placeholders})
      `;

      if (keys.includes('id') && updateSet.length > 0) {
        sql += ` ON CONFLICT ("id") DO UPDATE SET ${updateSet}`;
      } else if (keys.includes('id')) {
        sql += ` ON CONFLICT ("id") DO NOTHING`;
      }

      await client.query(sql, values);
    }
    await client.query('COMMIT');
  } catch (err: any) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch {}
    }
    console.warn(`[PostgreSQL] Failed syncing table ${tableName}:`, err?.message || err);
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function syncSingleRecordToPostgres(tableName: string, record: any): Promise<void> {
  const pool = getPool();
  if (!pool || !record || typeof record !== 'object') return;
  try {
    const keys = Object.keys(record);
    if (keys.length === 0) return;

    const values = keys.map(k => {
      const v = record[k];
      if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
        return JSON.stringify(v);
      }
      return v;
    });

    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const updateSet = keys
      .filter(k => k !== 'id')
      .map((k) => `"${k}" = EXCLUDED."${k}"`)
      .join(', ');

    const quotedKeys = keys.map(k => `"${k}"`).join(', ');

    let sql = `
      INSERT INTO "${tableName}" (${quotedKeys})
      VALUES (${placeholders})
    `;

    if (keys.includes('id') && updateSet.length > 0) {
      sql += ` ON CONFLICT ("id") DO UPDATE SET ${updateSet}`;
    } else if (keys.includes('id')) {
      sql += ` ON CONFLICT ("id") DO NOTHING`;
    }

    await pool.query(sql, values);
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
