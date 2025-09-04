import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { join, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import * as schema from './schema';
import 'dotenv/config';

// Resolve the database file path to ensure it points to a writable location.
// If DB_FILE_NAME is not provided, fall back to a temporary directory.
const envPath = process.env.DB_FILE_NAME;
const dbFile = envPath
  ? isAbsolute(envPath)
    ? envPath
    : join(tmpdir(), envPath)
  : join(tmpdir(), 'local.db');

const sqlite = new Database(dbFile, { fileMustExist: false, readonly: false });
export const db = drizzle(sqlite, { schema });
