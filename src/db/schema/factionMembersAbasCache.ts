import { table, serial, int, text, timestamp, uniqueIndex } from './helpers';

export const factionMembersAbasCache = table('api_cache_abas', {
  id: serial('id'),
  character_id: int('character_id').notNull(),
  faction_id: int('faction_id').notNull(),
  abas: text('abas'),
  total_abas: int('total_abas'),
  last_sync_timestamp: timestamp('last_sync_timestamp'),
}, (table) => ({
  unq: uniqueIndex('api_cache_abas_character_id_faction_id_unique').on(
    table.character_id,
    table.faction_id,
  ),
}));
