import { table, serial, int, text } from './helpers';
import { users } from './users';
import { factions } from './factions';
import { activityRosters } from './activityRosters';

export const activityRosterFavorites = table('activity_roster_favorites', {
  id: serial('id'),
  user_id: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  faction_id: int('faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
  activity_roster_id: int('activity_roster_id').notNull().references(() => activityRosters.id, { onDelete: 'cascade' }),
  activity_roster_name: text('activity_roster_name', { length: 255 }).notNull(),
});
