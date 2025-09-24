import { table, serial, int, text, timestamp, now } from './helpers';
import { factions } from './factions';
import { users } from './users';

export const apiForumSyncableGroups = table('api_forum_syncable_groups', {
  id: serial('id'),
  faction_id: int('faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
  group_id: int('group_id').notNull(),
  name: text('name', { length: 255 }).notNull(),
  created_at: timestamp('created_at').default(now()),
  updated_at: timestamp('updated_at').default(now()),
  created_by: int('created_by').notNull().references(() => users.id),
});
