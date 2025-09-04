import { defineConfig } from 'drizzle-kit';
import { join, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import 'dotenv/config';

// Resolve database file path for drizzle CLI as well.
const envPath = process.env.DB_FILE_NAME;
const dbFile = envPath
  ? isAbsolute(envPath)
    ? envPath
    : join(process.cwd(), envPath)
  : join(tmpdir(), 'local.db');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: `file:${dbFile}`,
  },
  strict: true,
  verbose: true,
});
