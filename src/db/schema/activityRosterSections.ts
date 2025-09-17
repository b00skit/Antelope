import { table, serial, int, text, json, jsonDefault } from './helpers';
import { activityRosters } from './activityRosters';

export const activityRosterSections = table('activity_roster_sections', {
  id: serial('id'),
  activity_roster_id: int('activity_roster_id').notNull().references(() => activityRosters.id, { onDelete: 'cascade' }),
  name: text('name', { length: 255 }).notNull(),
  description: text('description'),
  character_ids_json: json('character_ids_json').$type<number[]>().default(jsonDefault([])),
  order: int('order').default(0),
  configuration_json: json('configuration_json').$type<{
    include_names?: string[];
    include_ranks?: number[];
    include_forum_groups?: number[];
    exclude_names?: string[];
    alternative_characters?: boolean;
  }>(),
});
