import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    // if DB_FILE_NAME is "./local.db", this becomes "file:./local.db"
    url: `file:${process.env.DB_FILE_NAME ?? './local.db'}`,
  },
  strict: true,
  verbose: true,
});
