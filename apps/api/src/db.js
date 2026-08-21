import pg from 'pg';
import { config } from './config.js';

const pool = new pg.Pool({ connectionString: config().databaseUrl });

export const query = (text, values) => pool.query(text, values);
export async function transaction(callback) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await callback(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
