import { table, serial, int, text, uniqueIndex } from './helpers';
import { activityRosters } from './activityRosters';

export const activityRosterLabels = table('activity_roster_labels', {
  id: serial('id'),
  activity_roster_id: int('activity_roster_id').notNull().references(() => activityRosters.id, { onDelete: 'cascade' }),
  character_id: int('character_id').notNull(),
  color: text('color', { length: 50 }).notNull(), // e.g., 'red', 'blue'
}, (table) => ({
    unq: uniqueIndex('roster_character_label_unique_idx').on(table.activity_roster_id, table.character_id),
}));
