import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password'), // Nullable for OAuth users
  gtaw_user_id: integer('gtaw_user_id').unique(),
  last_sync_timestamp: integer('last_sync_timestamp', { mode: 'timestamp' }),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  csrfToken: text('csrf_token').notNull(),
  gtawAccessToken: text('gtaw_access_token'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const factions = sqliteTable('factions', {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    color: text('color'),
    access_rank: integer('access_rank').default(15),
    moderation_rank: integer('moderation_rank').default(15),
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

export const usersRelations = relations(users, ({ many }) => ({
	factionMembers: many(factionMembers),
}));

export const factionsRelations = relations(factions, ({ many }) => ({
	factionMembers: many(factionMembers),
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
