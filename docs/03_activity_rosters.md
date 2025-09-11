# **App Name**: Activity Rosters

## Backend Setup:
- Create an activty_rosters table, in the activity_rosters table ensure you have a id, faction_id, name, roster_setup_json (nullable), is_public, created_by, created_at, updated_at
- Create an isLoggedIn & hasActiveFaction navitem called "Activity Rosters".
- The prequisit for viewing a faction's roster is that a user has to be part of the faction and either own the roster or the roster has to be public.

## Instructions:
- Only do the implementation in phases, as provided by the developer. You may read the other phases for context but don't worry about implementation of other phases.

### Phase 1:
- The landing page of /activity-rosters should have a list of available rosters in rows as well as a created_by and created_at data displays. If the person is the created_by owner, then the person should have the ability to edit / remove the roster.
- Add the ability to create a new roster which should take you to a page for creating a new roster, in there you can setup the name of the roster, if it's public or not, and add an unload for a json file. (For now don't add any functionality or save the file, this will be done in a later phase).
- The created rosters should show up on the landing page of /activity-rosters.

### Phase 2:
- If you click on a roster, then it should call the /api/faction/(id) for gtaw where id is the faction_id

This should load something similar to this:
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
      },
      {
        "character_id": 179380,
        "character_name": "Legal FM",
        "rank": 15,
        "rank_name": "Sheriff",
        "last_online": null,
        "last_duty": null
      },
      {
        "character_id": 69643,
        "character_name": "Ximena Navarro",
        "rank": 13,
        "rank_name": "Division Chief",
        "last_online": null,
        "last_duty": null
      },
      {
        "character_id": 114074,
        "character_name": "Dustin Imler",
        "rank": 13,
        "rank_name": "Assistant Sheriff",
        "last_online": null,
        "last_duty": null
      },
      {
        "character_id": 26560,
        "character_name": "Gregory Reznik",
        "rank": 13,
        "rank_name": "Assistant Sheriff",
        "last_online": null,
        "last_duty": null
      },
      {
        "character_id": 59995,
        "character_name": "Ruben Davenport",
        "rank": 13,
        "rank_name": "Division Chief",
        "last_online": null,
        "last_duty": null
      },
      {
        "character_id": 20787,
        "character_name": "Philip Turner",
        "rank": 13,
        "rank_name": "Division Chief",
        "last_online": null,
        "last_duty": null
      },
      {
        "character_id": 54957,
        "character_name": "Kennedy Laine",
        "rank": 13,
        "rank_name": "Division Chief",
        "last_online": null,
        "last_duty": null
      },
      {
        "character_id": 128156,
        "character_name": "Eddie Orozco",
        "rank": 12,
        "rank_name": "Commander",
        "last_online": null,
        "last_duty": null
      }, ...
  ]}
}

- It should load a sort of table of all said characters and it should load all their information within the table.
- If roster_setup_json is empty, then it should load the entire roster.

### Phase 3:
- Setup some sort of way to filter characters based on your json setup when you upload the json, you should be able to edit the json setup as well in roster_setup_json
- If roster_setup_json is set, then it should only filter the characters in the roster_setup_json
- Give an example of the json which the user should upload.