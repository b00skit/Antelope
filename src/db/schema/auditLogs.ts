import { table, serial, int, text, json, timestamp, now, enumeration } from './helpers';
import { factions } from './factions';
import { users } from './users';

export const factionAuditLogs = table('faction_audit_logs', {
  id: serial('id'),
  faction_id: int('faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
  user_id: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: enumeration('category', ['sync_management', 'user_management', 'roster_management', 'faction_management']).notNull(),
  action: text('action', { length: 255 }).notNull(),
  details: json('details').$type<any>(),
  created_at: timestamp('created_at').default(now()),
});
