import { table, serial, int, timestamp, now } from './helpers';
import { factions } from './factions';
import { users } from './users';

export const factionBlockedUsers = table('faction_blocked_users', {
    id: serial('id'),
    faction_id: int('faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
    user_id: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    blocked_by_user_id: int('blocked_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at').default(now()),
});
