import { table, serial, int, text, enumeration } from './helpers';
import { users } from './users';
import { factions } from './factions';

export const organizationFavorites = table('organization_favorites', {
  id: serial('id'),
  user_id: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  faction_id: int('faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
  category_id: int('category_id').notNull(),
  category_type: enumeration('category_type', ['cat_2', 'cat_3']).notNull(),
  category_name: text('category_name', { length: 255 }).notNull(),
  category_path: text('category_path', { length: 255 }).notNull(),
});
