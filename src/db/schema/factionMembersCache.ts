import { table, int, json, timestamp } from './helpers';

export const factionMembersCache = table('faction_members_cache', {
  faction_id: int('faction_id').primaryKey(),
  members: json('members').$type<any[]>(),
  last_sync_timestamp: timestamp('last_sync_timestamp'),
});
