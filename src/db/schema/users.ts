import { table, serial, text, int, timestamp } from './helpers';
import { factions } from './factions';

export const users = table('users', {
  id: serial('id'),
  username: text('username', { length: 255 }).notNull().unique(),
  password: text('password', { length: 255 }),
  gtaw_user_id: int('gtaw_user_id').unique(),
  last_sync_timestamp: timestamp('last_sync_timestamp'),
  selected_faction_id: int('selected_faction_id').references(() => factions.id, { onDelete: 'set null' }),
  role: text('role', { length: 255 }).default('guest').notNull(),
});
