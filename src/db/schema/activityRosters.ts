import { table, serial, int, text, enumeration, timestamp, now, json } from './helpers';
import { factions } from './factions';
import { users } from './users';

export const activityRosters = table('activity_rosters', {
  id: serial('id'),
  factionId: int('faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
  name: text('name', { length: 255 }).notNull(),
  roster_setup_json: text('roster_setup_json'),
  visibility: enumeration('visibility', ['personal', 'private', 'unlisted', 'public']).default('personal').notNull(),
  password: text('password', { length: 255 }),
  access_json: json('access_json').$type<number[]>(),
  organization_category_type: enumeration('organization_category_type', ['cat_2', 'cat_3']),
  organization_category_id: int('organization_category_id'),
  created_by: int('created_by').notNull().references(() => users.id),
  created_at: timestamp('created_at').default(now()),
  updated_at: timestamp('updated_at').default(now()),
});
