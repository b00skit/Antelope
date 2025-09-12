# **App Name**: Character Sheets

## Backend Setup:
- Create an isLoggedIn & hasActiveFaction & isEnabled end-point called /character-sheets/[firstname]_[lastname]
- Create a faction_character_sheets_cache table, it should have information such as the character_id, user_id, faction_id, rank and pretty much all information such as this stored in it's row/entry, ensure you also have a last_sync_timestamp as a column.
{
  "data": {
    "user_id": 123,
    "character_id": 190973,
    "firstname": "Ryan",
    "lastname": "Herrera",
    "rank": 12,
    "rank_name": "Captain",
    "abas": "0.34",
    "last_online": null,
    "last_duty": null,
    "alternative_characters": [
      {
        "user_id": 123,
        "character_id": 181647,
        "character_name": "Beau Lawson",
        "rank": 11,
        "rank_name": "Sergeant",
        "abas": "2.41",
        "last_online": null,
        "last_duty": null
      },
      {
        "user_id": 123,
        "character_id": 189337,
        "character_name": "Layla Blake",
        "rank": 5,
        "rank_name": "Deputy Sheriff",
        "abas": "0.20",
        "last_online": null,
        "last_duty": null
      }
    ]
  }
}
- Create a faction_members_cache table that has the following columns and last_sync_timestamp:
{
  "data": {
    "id": 187,
    "name": "LS County Sheriff's Department",
    "tag": "N/A",
    "members": [
      {
        "character_id": 129203,
        "character_name": "Santiago Vazquez",
        "rank": 15,
        "rank_name": "Sheriff",
        "last_online": null,
        "last_duty": null
      },
      {
        "character_id": 56015,
        "character_name": "Jonathan Medina",
        "rank": 15,
        "rank_name": "Sheriff",
        "last_online": null,
        "last_duty": null
      },
      {
        "character_id": 65705,
        "character_name": "Vincent Rueles",
        "rank": 15,
        "rank_name": "LFM",
        "last_online": null,
        "last_duty": null
      }, ...
    ]}
},


## Instructions:
- Only do the implementation in phases, as provided by the developer. You may read the other phases for context but don't worry about implementation of other phases.

### Phase 1:
- Upon loading the /character-sheets/[firstname]_[lastname] page, automatically fetch data from the api faction/{factionId}/character/{characterId}, the character id can be fetched from the faction_members_cache table. If the faction cache wasn't refreshed in the last 24 hours, an api call should be made to refresh the faction cache.
- The page should load up some sort of character sheet of sorts, loading the following data from the api call:
{
  "data": {
    "user_id": 123,
    "character_id": 190973,
    "firstname": "Ryan",
    "lastname": "Herrera",
    "rank": 12,
    "rank_name": "Captain",
    "abas": "0.34",
    "last_online": null,
    "last_duty": null,
    "alternative_characters": [
      {
        "user_id": 123,
        "character_id": 181647,
        "character_name": "Beau Lawson",
        "rank": 11,
        "rank_name": "Sergeant",
        "abas": "2.41",
        "last_online": null,
        "last_duty": null
      },
      {
        "user_id": 123,
        "character_id": 189337,
        "character_name": "Layla Blake",
        "rank": 5,
        "rank_name": "Deputy Sheriff",
        "abas": "0.20",
        "last_online": null,
        "last_duty": null
      }
    ]
  }
}

## Phase 2:
- Create a search box in the navbar if character sheets are enabled for the faction. If someone types in a firstname and lastname, it should lead them to the /character-sheets/[firstname]_[lastname] page