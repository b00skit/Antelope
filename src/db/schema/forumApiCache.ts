import { table, serial, int, json, timestamp, uniqueIndex } from './helpers';

export const forumApiCache = table('api_cache_forums', {
  id: serial('id'),
  faction_id: int('faction_id').notNull(),
  group_id: int('group_id').notNull(),
  data: json('data').$type<{ members: { id: number; username: string }[] }>(),
  last_sync_timestamp: timestamp('last_sync_timestamp'),
}, (table) => ({
    unq: uniqueIndex('faction_forum_group_unique_idx').on(table.faction_id, table.group_id),
}));
