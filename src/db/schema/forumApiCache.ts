import { table, serial, int, json, timestamp, uniqueIndex } from './helpers';

export const forumApiCache = table('api_cache_forums', {
  id: serial('id'),
  group_id: int('group_id').notNull().unique(),
  data: json('data').$type<{ members: { id: number; username: string }[] }>(),
  last_sync_timestamp: timestamp('last_sync_timestamp'),
});
