# **App Name**: Faction System

## Backend Setup:
- Create a factions table, in the factions table ensure you have a id, name, color (default: null), access_rank (default: 15), moderation_rank (default: 15)
- Modify the users table to have a last_sync_timestamp column
- Create an isLoggedIn navitem + page for factions, ensure you check auth for the endpoint.
- Create a factions_members table, which has a relationship between users and factions and should also have a rank column and "joined" column, where you can define a many-to-many relationship, so one person can be in multiple factions, and factions can support multiple users.

## Instructions:

- Only do the implementation in phases, as provided by the developer. You may read the other phases for context but don't worry about implementation of other phases.

### Phase 1:
- Upon loading the /factions page, if the user has an empty last_sync_timestamp or if the timestamp is within the last 24 hours (defined in data/config.json), then make a call to the GTA:W API under /api/factions, it should return data of all your characters that are in a faction like so::
{
  "data": {
    "3345": {
      "faction": 187,
      "faction_name": "LS County Sheriff's Department",
      "faction_rank": 12,
      "faction_rank_name": "Captain"
    },
    "3844": {
      "faction": 187,
      "faction_name": "LS County Sheriff's Department",
      "faction_rank": 11,
      "faction_rank_name": "Lieutenant"
    },
    "29013": {
      "faction": 187,
      "faction_name": "LS County Sheriff's Department",
      "faction_rank": 11,
      "faction_rank_name": "Deputy Sheriff (Bonus II)"
    },
    "100026": {
      "faction": 187,
      "faction_name": "LS County Sheriff's Department",
      "faction_rank": 11,
      "faction_rank_name": "Lieutenant"
    },
    "100059": {
      "faction": 187,
      "faction_name": "LS County Sheriff's Department",
      "faction_rank": 11,
      "faction_rank_name": "Detective"
    }
  }
}
you should go through all the data and add only the highest rank for each faction the user's in IF the faction already exists in the database, if not, skip. If the faction_members already exists and there's a new higher rank, update it. Add a sync into the users table to update the last_sync_timestamp.

### Phase 2:
- Add a "Enroll Faction" button which should open a new page /factions/enroll which again makes the same api call, this time, you'll return and prompt the user which faction they wish to add based on the list from the api call, only show the user factions in which they're rank 15.
- It should load a page where a user can modify the name of the faction and also modify the access_rank and leadership_rank and the ability to pick the color.
- Once the faction's added save it in factions table.

### Phase 3:
- If a faction is added and the user is a faction_member and if the user has access_level then add a join button which if a user presses then the join column in faction_members should prop to 1
- If the user is in a faction and they have leadership_level, then they should have the ability to edit a faction including the ability to opt it back out which should completely remove the faction from the database.