import { table, serial, int, text, boolean, json, jsonDefault, uniqueIndex } from './helpers';

export const apiCacheAlternativeCharacters = table('api_cache_alternative_characters', {
  id: serial('id'),
  character_id: int('character_id').notNull(),
  user_id: int('user_id').notNull(),
  faction_id: int('faction_id').notNull(),
  character_name: text('character_name', { length: 255 }).notNull(),
  rank: int('rank').notNull(),
  manually_set: boolean('manually_set').default(false).notNull(),
  alternative_characters_json: json('alternative_characters_json').$type<any[]>().default(jsonDefault([])),
}, (table) => ({
    unq: uniqueIndex('user_faction_alt_cache_unique_idx').on(table.user_id, table.faction_id),
}));
