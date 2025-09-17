import { table, serial, int, text, json, timestamp, now } from './helpers';
import { factions } from './factions';
import { users } from './users';
import { activityRosters } from './activityRosters';

export const activityRosterSnapshots = table('activity_roster_snapshots', {
  id: serial('id'),
  faction_id: int('faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
  source_roster_id: int('source_roster_id').notNull().references(() => activityRosters.id, { onDelete: 'cascade' }),
  name: text('name', { length: 255 }).notNull(),
  created_by: int('created_by').notNull().references(() => users.id),
  created_at: timestamp('created_at').default(now()),
  data_json: json('data_json').notNull(),
});
