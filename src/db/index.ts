import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import 'dotenv/config';

const dbFile = process.env.DB_FILE_NAME;
if (!dbFile) {
  throw new Error('DB_FILE_NAME is not set');
}

const sqlite = new Database(dbFile);
export const db = drizzle(sqlite, { schema });