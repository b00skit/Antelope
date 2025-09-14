import { table, int, text, double, json, jsonDefault } from './helpers';

export const factions = table('factions', {
  id: int('id').primaryKey(),
  name: text('name', { length: 255 }).notNull(),
  color: text('color', { length: 255 }),
  access_rank: int('access_rank').default(15),
  administration_rank: int('administration_rank').default(15),
  supervisor_rank: int('supervisor_rank').default(10),
  minimum_abas: double('minimum_abas').default(0),
  minimum_supervisor_abas: double('minimum_supervisor_abas').default(0),
  feature_flags: json('feature_flags')
    .$type<{ activity_rosters_enabled?: boolean; character_sheets_enabled?: boolean; statistics_enabled?: boolean; }>()
    .default(jsonDefault({ activity_rosters_enabled: true, character_sheets_enabled: true, statistics_enabled: true })),
  phpbb_api_url: text('phpbb_api_url', { length: 255 }),
  phpbb_api_key: text('phpbb_api_key', { length: 255 }),
});
