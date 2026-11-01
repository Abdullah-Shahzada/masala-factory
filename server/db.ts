import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT) || (host.includes('tidbcloud') ? 4000 : 3306);
const user = process.env.DB_USER || process.env.DB_USERNAME || 'root';
const password = process.env.DB_PASSWORD || '';
// Automatically resolve database name and prevent fallback to system databases like 'sys' or 'test'
const configuredDb = process.env.DB_NAME || process.env.DB_DATABASE || 'masala_factory';
const database = (configuredDb === 'sys' || configuredDb === 'test') ? 'masala_factory' : configuredDb;

// Auto-detect SSL: if DB_SSL is explicitly set or if connecting to TiDB Cloud / Aiven
const isCloud = host.includes('tidbcloud.com') || host.includes('aivencloud.com') || host.includes('planetscale');
const useSsl = process.env.DB_SSL === 'true' || (process.env.DB_SSL !== 'false' && isCloud);

export const pool = mysql.createPool({
  host,
  port,
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: useSsl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

export const testConnection = async (): Promise<boolean> => {
  try {
    const conn = await pool.getConnection();
    console.log(`[MySQL] Connected successfully to ${user}@${host}:${port}/${database}`);
    conn.release();
    return true;
  } catch (error: any) {
    console.error(`[MySQL] Connection error to ${host}:${port}:`, error.message);
    return false;
  }
};
