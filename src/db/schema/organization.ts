import { table, serial, int, text, json, timestamp, now, enumeration } from './helpers';
import { factions } from './factions';
import { users } from './users';

export const factionOrganizationSettings = table('faction_organization_settings', {
  faction_id: int('faction_id').primaryKey().references(() => factions.id, { onDelete: 'cascade' }),
  category_1_name: text('category_1_name', { length: 255 }).default('Division'),
  category_2_name: text('category_2_name', { length: 255 }).default('Unit'),
  category_3_name: text('category_3_name', { length: 255 }).default('Detail'),
});

export const factionOrganizationCat1 = table('faction_organization_cat1', {
  id: serial('id'),
  faction_id: int('faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
  name: text('name', { length: 255 }).notNull(),
  short_name: text('short_name', { length: 50 }),
  access_json: json('access_json').$type<number[]>(),
  created_by: int('created_by').notNull().references(() => users.id),
  created_at: timestamp('created_at').default(now()),
  updated_at: timestamp('updated_at').default(now()),
});

export const factionOrganizationCat2 = table('faction_organization_cat2', {
  id: serial('id'),
  faction_id: int('faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
  cat1_id: int('cat1_id').notNull().references(() => factionOrganizationCat1.id, { onDelete: 'cascade' }),
  name: text('name', { length: 255 }).notNull(),
  short_name: text('short_name', { length: 50 }),
  access_json: json('access_json').$type<number[]>(),
  settings_json: json('settings_json').$type<{ allow_cat3?: boolean; forum_group_id?: number }>(),
  created_by: int('created_by').notNull().references(() => users.id),
  created_at: timestamp('created_at').default(now()),
  updated_at: timestamp('updated_at').default(now()),
});

export const factionOrganizationCat3 = table('faction_organization_cat3', {
  id: serial('id'),
  faction_id: int('faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
  cat2_id: int('cat2_id').notNull().references(() => factionOrganizationCat2.id, { onDelete: 'cascade' }),
  name: text('name', { length: 255 }).notNull(),
  short_name: text('short_name', { length: 50 }),
  access_json: json('access_json').$type<number[]>(),
  settings_json: json('settings_json').$type<{ forum_group_id?: number }>(),
  created_by: int('created_by').notNull().references(() => users.id),
  created_at: timestamp('created_at').default(now()),
  updated_at: timestamp('updated_at').default(now()),
});

export const factionOrganizationMembership = table('faction_organization_membership', {
  id: serial('id'),
  type: enumeration('type', ['cat_2', 'cat_3']).notNull(),
  category_id: int('category_id').notNull(),
  character_id: int('character_id').notNull(),
  title: text('title', { length: 255 }),
  created_by: int('created_by').notNull().references(() => users.id),
  created_at: timestamp('created_at').default(now()),
  updated_at: timestamp('updated_at').default(now()),
});
