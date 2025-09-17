import { table, int, json, timestamp } from './helpers';

export const factionMembersCache = table('api_cache_factions', {
  faction_id: int('faction_id').primaryKey(),
  members: json('members').$type<any[]>(),
  last_sync_timestamp: timestamp('last_sync_timestamp'),
});
