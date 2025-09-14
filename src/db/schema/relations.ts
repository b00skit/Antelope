import { relations } from 'drizzle-orm';
import { users } from './users';
import { factions } from './factions';
import { factionMembers } from './factionMembers';
import { activityRosters } from './activityRosters';
import { activityRosterAccess } from './activityRosterAccess';
import { activityRosterFavorites } from './activityRosterFavorites';
import { activityRosterSections } from './activityRosterSections';
import { forumApiCache } from './forumApiCache';

export const usersRelations = relations(users, ({ many, one }) => ({
  factionMembers: many(factionMembers),
  selectedFaction: one(factions, {
    fields: [users.selected_faction_id],
    references: [factions.id],
  }),
  activityRosters: many(activityRosters),
  favoriteRosters: many(activityRosterFavorites),
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

export const activityRostersRelations = relations(activityRosters, ({ one, many }) => ({
  faction: one(factions, {
    fields: [activityRosters.factionId],
    references: [factions.id],
  }),
  author: one(users, {
    fields: [activityRosters.created_by],
    references: [users.id],
  }),
  forumCache: one(forumApiCache, {
    fields: [activityRosters.id],
    references: [forumApiCache.activity_roster_id],
  }),
  sections: many(activityRosterSections),
  accessGrants: many(activityRosterAccess),
}));

export const activityRosterAccessRelations = relations(activityRosterAccess, ({ one }) => ({
  user: one(users, {
    fields: [activityRosterAccess.user_id],
    references: [users.id],
  }),
  roster: one(activityRosters, {
    fields: [activityRosterAccess.activity_roster_id],
    references: [activityRosters.id],
  }),
}));

export const activityRosterFavoritesRelations = relations(activityRosterFavorites, ({ one }) => ({
  user: one(users, {
    fields: [activityRosterFavorites.user_id],
    references: [users.id],
  }),
  faction: one(factions, {
    fields: [activityRosterFavorites.faction_id],
    references: [factions.id],
  }),
  activityRoster: one(activityRosters, {
    fields: [activityRosterFavorites.activity_roster_id],
    references: [activityRosters.id],
  }),
}));

export const activityRosterSectionsRelations = relations(activityRosterSections, ({ one }) => ({
  roster: one(activityRosters, {
    fields: [activityRosterSections.activity_roster_id],
    references: [activityRosters.id],
  }),
}));

export const forumApiCacheRelations = relations(forumApiCache, ({ one }) => ({
  activityRoster: one(activityRosters, {
    fields: [forumApiCache.activity_roster_id],
    references: [activityRosters.id],
  }),
}));
