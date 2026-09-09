import { Pool, QueryResult } from 'pg';
import crypto from 'crypto';

export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pgPool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client in Neon:', err);
});

export async function pgQuery<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  return await pgPool.query<T>(text, params);
}

export async function testPgConnection(): Promise<boolean> {
  try {
    const res = await pgPool.query('SELECT NOW() AS server_time');
    console.log('[PostgreSQL] Connected to Neon DB successfully at:', res.rows[0]?.server_time);
    return true;
  } catch (err) {
    console.error('[PostgreSQL] Connection failed:', err);
    return false;
  }
}

// Utility to safely insert or update PostgreSQL records
export async function syncTableToPostgres(tableName: string, records: any[]): Promise<void> {
  if (!records || records.length === 0) return;
  const client = await pgPool.connect();
  try {
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
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[PostgreSQL] Failed syncing table ${tableName}:`, err);
  } finally {
    client.release();
  }
}

export async function syncSingleRecordToPostgres(tableName: string, record: any): Promise<void> {
  if (!record || typeof record !== 'object') return;
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

    await pgPool.query(sql, values);
  } catch (err) {
    console.error(`[PostgreSQL] Failed upserting single record to ${tableName}:`, err);
  }
}

export async function deleteRecordFromPostgres(tableName: string, id: number): Promise<void> {
  try {
    await pgPool.query(`DELETE FROM "${tableName}" WHERE "id" = $1`, [id]);
  } catch (err) {
    console.error(`[PostgreSQL] Failed deleting record ${id} from ${tableName}:`, err);
  }
}
