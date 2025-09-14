import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import { join, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import * as schema from './schema';
import 'dotenv/config';

const dbType = process.env.DATABASE ?? 'sqlite';
let dbInstance: any;

if (dbType === 'mysql' || dbType === 'mariadb') {
  const pool = mysql.createPool(process.env.DB_URL!);
  dbInstance = drizzleMysql(pool, { schema });
} else {
  const envPath = process.env.DB_FILE_NAME;
  const dbFile = envPath
    ? isAbsolute(envPath)
      ? envPath
      : join(process.cwd(), envPath)
    : join(tmpdir(), 'local.db');

  const sqlite = new Database(dbFile, { fileMustExist: false, readonly: false });
  dbInstance = drizzleSqlite(sqlite, { schema });
}

export const db = dbInstance;
