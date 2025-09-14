import { relations } from 'drizzle-orm';
import { users } from './users';
import { factions } from './factions';
import { factionMembers } from './factionMembers';
import { activityRosters } from './activityRosters';
import { activityRosterAccess } from './activityRosterAccess';
import { activityRosterFavorites } from './activityRosterFavorites';
import { activityRosterSections } from './activityRosterSections';
import { forumApiCache } from './forumApiCache';
import { 
  factionOrganizationSettings, 
  factionOrganizationCat1,
  factionOrganizationCat2,
  factionOrganizationCat3,
  factionOrganizationMembership
} from './organization';


export const usersRelations = relations(users, ({ many, one }) => ({
  factionMembers: many(factionMembers),
  selectedFaction: one(factions, {
    fields: [users.selected_faction_id],
    references: [factions.id],
  }),
  activityRosters: many(activityRosters),
  favoriteRosters: many(activityRosterFavorites),
}));

export const factionsRelations = relations(factions, ({ one, many }) => ({
  factionMembers: many(factionMembers),
  activityRosters: many(activityRosters),
  organizationSettings: one(factionOrganizationSettings, {
    fields: [factions.id],
    references: [factionOrganizationSettings.faction_id],
  }),
  organizationCat1s: many(factionOrganizationCat1),
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

// Organization Relations
export const factionOrganizationSettingsRelations = relations(factionOrganizationSettings, ({ one }) => ({
  faction: one(factions, {
    fields: [factionOrganizationSettings.faction_id],
    references: [factions.id],
  }),
}));

export const factionOrganizationCat1Relations = relations(factionOrganizationCat1, ({ one, many }) => ({
  faction: one(factions, {
    fields: [factionOrganizationCat1.faction_id],
    references: [factions.id],
  }),
  creator: one(users, {
    fields: [factionOrganizationCat1.created_by],
    references: [users.id],
  }),
  cat2s: many(factionOrganizationCat2),
}));

export const factionOrganizationCat2Relations = relations(factionOrganizationCat2, ({ one, many }) => ({
  faction: one(factions, {
    fields: [factionOrganizationCat2.faction_id],
    references: [factions.id],
  }),
  cat1: one(factionOrganizationCat1, {
    fields: [factionOrganizationCat2.cat1_id],
    references: [factionOrganizationCat1.id],
  }),
  creator: one(users, {
    fields: [factionOrganizationCat2.created_by],
    references: [users.id],
  }),
  cat3s: many(factionOrganizationCat3),
}));

export const factionOrganizationCat3Relations = relations(factionOrganizationCat3, ({ one }) => ({
  faction: one(factions, {
    fields: [factionOrganizationCat3.faction_id],
    references: [factions.id],
  }),
  cat2: one(factionOrganizationCat2, {
    fields: [factionOrganizationCat3.cat2_id],
    references: [factionOrganizationCat2.id],
  }),
  creator: one(users, {
    fields: [factionOrganizationCat3.created_by],
    references: [users.id],
  }),
}));
