import { table, int, json, timestamp } from './helpers';
import { activityRosters } from './activityRosters';

export const forumApiCache = table('forum_api_cache', {
  activity_roster_id: int('activity_roster_id').primaryKey().references(() => activityRosters.id, { onDelete: 'cascade' }),
  data: json('data').$type<{ includedUsernames: string[]; excludedUsernames: string[] }>(),
  last_sync_timestamp: timestamp('last_sync_timestamp'),
});
