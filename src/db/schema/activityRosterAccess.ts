import { table, serial, int } from './helpers';
import { users } from './users';
import { activityRosters } from './activityRosters';

export const activityRosterAccess = table('activity_roster_access', {
  id: serial('id'),
  user_id: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  activity_roster_id: int('activity_roster_id').notNull().references(() => activityRosters.id, { onDelete: 'cascade' }),
});
