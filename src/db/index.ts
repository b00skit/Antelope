import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { join, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import * as schema from './schema';
import 'dotenv/config';

// Choose a scalable database backend based on environment variables.
// If DATABASE_URL is provided, use PostgreSQL via pg; otherwise fall back to
// the local SQLite database used previously.
let db: any;

if (process.env.DATABASE_URL) {
  // Optional dependency: pg must be installed in production when using
  // PostgreSQL. We require it dynamically to avoid build-time resolution
  // errors when the package isn't present.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require('pg');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { drizzle } = require('drizzle-orm/node-postgres');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  // Resolve the database file path to ensure it points to a writable
  // location. If DB_FILE_NAME is not provided, fall back to a temporary
  // directory.
  const envPath = process.env.DB_FILE_NAME;
  const dbFile = envPath
    ? isAbsolute(envPath)
      ? envPath
      : join(process.cwd(), envPath)
    : join(tmpdir(), 'local.db');

  const sqlite = new Database(dbFile, { fileMustExist: false, readonly: false });
  db = drizzleSqlite(sqlite, { schema });
}

export { db };
