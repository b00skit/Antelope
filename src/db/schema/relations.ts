
import { relations } from 'drizzle-orm';
import { users } from './users';
import { factions } from './factions';
import { factionMembers } from './factionMembers';
import { activityRosters } from './activityRosters';
import { activityRosterAccess } from './activityRosterAccess';
import { activityRosterFavorites } from './activityRosterFavorites';
import { activityRosterSections } from './activityRosterSections';
import { activityRosterLabels } from './activityRosterLabels';
import { activityRosterSnapshots } from './activityRosterSnapshots';
import { apiForumSyncableGroups } from './apiForumSyncableGroups';
import { 
  factionOrganizationSettings, 
  factionOrganizationCat1,
  factionOrganizationCat2,
  factionOrganizationCat3,
  factionOrganizationMembership
} from './organization';
import { organizationFavorites } from './organizationFavorites';
import { factionBlockedUsers } from './factionBlockedUsers';


export const usersRelations = relations(users, ({ many, one }) => ({
  factionMembers: many(factionMembers),
  selectedFaction: one(factions, {
    fields: [users.selected_faction_id],
    references: [factions.id],
  }),
  activityRosters: many(activityRosters),
  favoriteRosters: many(activityRosterFavorites),
  organizationFavorites: many(organizationFavorites),
  blockedEntries: many(factionBlockedUsers),
  createdSyncableForumGroups: many(apiForumSyncableGroups),
}));

export const factionsRelations = relations(factions, ({ one, many }) => ({
  factionMembers: many(factionMembers),
  activityRosters: many(activityRosters),
  activityRosterSnapshots: many(activityRosterSnapshots),
  syncableForumGroups: many(apiForumSyncableGroups),
  organizationSettings: one(factionOrganizationSettings, {
    fields: [factions.id],
    references: [factionOrganizationSettings.faction_id],
  }),
  organizationCat1s: many(factionOrganizationCat1),
  blockedUsers: many(factionBlockedUsers),
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
  sections: many(activityRosterSections),
  labels: many(activityRosterLabels),
  accessGrants: many(activityRosterAccess),
  snapshots: many(activityRosterSnapshots),
  organizationCat2: one(factionOrganizationCat2, {
    fields: [activityRosters.id],
    references: [factionOrganizationCat2.activity_roster_id]
  }),
  organizationCat3: one(factionOrganizationCat3, {
    fields: [activityRosters.id],
    references: [factionOrganizationCat3.activity_roster_id]
  }),
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

export const activityRosterLabelsRelations = relations(activityRosterLabels, ({ one }) => ({
    roster: one(activityRosters, {
      fields: [activityRosterLabels.activity_roster_id],
      references: [activityRosters.id],
    }),
}));

export const activityRosterSnapshotsRelations = relations(activityRosterSnapshots, ({ one }) => ({
  faction: one(factions, {
    fields: [activityRosterSnapshots.faction_id],
    references: [factions.id],
  }),
  sourceRoster: one(activityRosters, {
    fields: [activityRosterSnapshots.source_roster_id],
    references: [activityRosters.id],
  }),
  creator: one(users, {
    fields: [activityRosterSnapshots.created_by],
    references: [users.id],
  }),
}));

export const apiForumSyncableGroupsRelations = relations(apiForumSyncableGroups, ({ one }) => ({
    faction: one(factions, {
        fields: [apiForumSyncableGroups.faction_id],
        references: [factions.id],
    }),
    creator: one(users, {
        fields: [apiForumSyncableGroups.created_by],
        references: [users.id],
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
  members: many(factionOrganizationMembership, { relationName: 'cat2_members' }),
  roster: one(activityRosters, {
    fields: [factionOrganizationCat2.activity_roster_id],
    references: [activityRosters.id],
  })
}));

export const factionOrganizationCat3Relations = relations(factionOrganizationCat3, ({ one, many }) => ({
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
  members: many(factionOrganizationMembership, { relationName: 'cat3_members' }),
  roster: one(activityRosters, {
    fields: [factionOrganizationCat3.activity_roster_id],
    references: [activityRosters.id],
  })
}));

export const factionOrganizationMembershipRelations = relations(factionOrganizationMembership, ({ one }) => ({
  creator: one(users, {
    fields: [factionOrganizationMembership.created_by],
    references: [users.id],
  }),
  cat2: one(factionOrganizationCat2, {
    fields: [factionOrganizationMembership.category_id],
    references: [factionOrganizationCat2.id],
    relationName: 'cat2_members'
  }),
  cat3: one(factionOrganizationCat3, {
    fields: [factionOrganizationMembership.category_id],
    references: [factionOrganizationCat3.id],
    relationName: 'cat3_members'
  }),
}));

export const organizationFavoritesRelations = relations(organizationFavorites, ({ one }) => ({
    user: one(users, {
      fields: [organizationFavorites.user_id],
      references: [users.id],
    }),
    faction: one(factions, {
      fields: [organizationFavorites.faction_id],
      references: [factions.id],
    }),
  }));

export const factionBlockedUsersRelations = relations(factionBlockedUsers, ({ one }) => ({
  faction: one(factions, {
    fields: [factionBlockedUsers.faction_id],
    references: [factions.id],
  }),
  user: one(users, {
    fields: [factionBlockedUsers.user_id],
    references: [users.id],
  }),
  blockedBy: one(users, {
    fields: [factionBlockedUsers.blocked_by_user_id],
    references: [users.id],
  }),
}));
