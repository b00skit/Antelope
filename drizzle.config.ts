import { defineConfig } from 'drizzle-kit';
import { join, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import 'dotenv/config';

const dbType = process.env.DATABASE ?? 'sqlite';
const envPath = process.env.DB_FILE_NAME;
const dbFile = envPath
  ? isAbsolute(envPath)
    ? envPath
    : join(process.cwd(), envPath)
  : join(tmpdir(), 'local.db');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: dbType === 'sqlite' ? 'sqlite' : 'mysql',
  dbCredentials: dbType === 'sqlite'
    ? { url: `file:${dbFile}` }
    : {
        url: `mysql://${process.env.DB_USERNAME!}:${process.env.DB_PASSWORD!}` +
          `@${process.env.DB_IP ?? '127.0.0.1'}:${process.env.DB_PORT ?? '3306'}/${process.env.DB_NAME!}`,
      },
  strict: true,
  verbose: true,
});
