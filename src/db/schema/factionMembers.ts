import { table, int, boolean, primaryKey } from './helpers';
import { users } from './users';
import { factions } from './factions';

export const factionMembers = table('faction_members', {
  userId: int('user_id').notNull().references(() => users.id),
  factionId: int('faction_id').notNull().references(() => factions.id),
  rank: int('rank').notNull(),
  joined: boolean('joined').default(false),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.factionId] }),
}));
