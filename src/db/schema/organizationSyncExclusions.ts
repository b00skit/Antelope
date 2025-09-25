import { table, serial, int, text, enumeration } from './helpers';

export const factionOrganizationSyncExclusions = table('faction_organization_sync_exclusions', {
  id: serial('id'),
  category_type: enumeration('category_type', ['cat_2', 'cat_3']).notNull(),
  category_id: int('category_id').notNull(),
  character_name: text('character_name', { length: 255 }).notNull(),
});
