import { sqliteTable, text, integer, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password'), // Nullable for OAuth users
  gtaw_user_id: integer('gtaw_user_id').unique(),
  last_sync_timestamp: integer('last_sync_timestamp', { mode: 'timestamp' }),
  selected_faction_id: integer('selected_faction_id').references(() => factions.id, { onDelete: 'set null' }),
});

export const factions = sqliteTable('factions', {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    color: text('color'),
    access_rank: integer('access_rank').default(15),
    moderation_rank: integer('moderation_rank').default(15),
    feature_flags: text('feature_flags', { mode: 'json' }).$type<{ activity_rosters_enabled?: boolean; character_sheets_enabled?: boolean; }>().default({ activity_rosters_enabled: true, character_sheets_enabled: true }),
});

export const factionMembers = sqliteTable('faction_members', {
    userId: integer('user_id').notNull().references(() => users.id),
    factionId: integer('faction_id').notNull().references(() => factions.id),
    rank: integer('rank').notNull(),
    joined: integer('joined', { mode: 'boolean' }).default(false),
}, (table) => {
    return {
        pk: primaryKey({ columns: [table.userId, table.factionId] }),
    }
});

export const activityRosters = sqliteTable('activity_rosters', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    factionId: integer('faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    roster_setup_json: text('roster_setup_json'),
    is_public: integer('is_public', { mode: 'boolean' }).default(false),
    created_by: integer('created_by').notNull().references(() => users.id),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const factionMembersCache = sqliteTable('faction_members_cache', {
    faction_id: integer('faction_id').primaryKey(),
    members: text('members', { mode: 'json' }).$type<any[]>(),
    last_sync_timestamp: integer('last_sync_timestamp', { mode: 'timestamp' }),
});

export const factionMembersAbasCache = sqliteTable('faction_members_abas_cache', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    character_id: integer('character_id').notNull(),
    faction_id: integer('faction_id').notNull(),
    abas: text('abas'),
    last_sync_timestamp: integer('last_sync_timestamp', { mode: 'timestamp' }),
}, (table) => {
    return {
        unq: uniqueIndex('faction_members_abas_cache_character_id_faction_id_unique').on(table.character_id, table.faction_id),
    }
});


export const usersRelations = relations(users, ({ many, one }) => ({
	factionMembers: many(factionMembers),
    selectedFaction: one(factions, {
        fields: [users.selected_faction_id],
        references: [factions.id],
    }),
    activityRosters: many(activityRosters),
}));

export const factionsRelations = relations(factions, ({ many }) => ({
	factionMembers: many(factionMembers),
    activityRosters: many(activityRosters),
}));

export const factionMembersRelations = relations(factionMembers, ({ one }) => ({
	user: one(users, {
		fields: [factionMembers.userId],
		references: [users.id],
	}),
	faction: one(factions, {
		fields: [factionMembers.factionId],
		references: [factions.id],
	}),
}));

export const activityRostersRelations = relations(activityRosters, ({ one }) => ({
    faction: one(factions, {
        fields: [activityRosters.factionId],
        references: [factions.id],
    }),
    author: one(users, {
        fields: [activityRosters.created_by],
        references: [users.id],
    }),
}));
