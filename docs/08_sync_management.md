# **App Name**: Sync Management

## Backend Setup:
- Setup a new table called api_forum_syncable_groups with the following fields; id, faction_id, group_id, name, created_at, updated_at, created_by

## Instructions:
- Only do the implementation in phases, as provided by the developer. You may read the other phases for context but don't worry about implementation of other phases.

### Phase 1:
- We'll be refactoring the current Sync Management system. First off, remove any calls that currently sync or make a GTA:W API call to /api/faction/(faction_id) & /api/faction/(faction_id)/abas & forum api calls app.php/booskit/phpbbapi/group/(group_id) from pages that are not sync management.
- Remove any force sync buttons on pages that are not sync management.

### Phase 2:
- All those pages should only default from fetching data from the database directly.

### Phase 3:
- To the page /factions/manage and /factions/enroll add a button under Forum Integration called "Forum Groups" (the button should be disabled until the forum URL and API key are put in) which opens up a pop-up, the pop-up should make an API call for: Once the pop-up opens a multi-select searchable dropdown appears that grabs data from app.php/booskit/phpbbapi/groups, this data shouldn't cache anywhere. You should be able to select the groups which get added to api_forum_syncable_groups.

### Phase 4:
- The Sync Management page should be revamped entirely in terms of looks to account for the following implementation:
    - There should be three buttons, Sync Faction Data, Sync Character Data, Sync Forum Data.
    - When pressing any button, store the data in some sort of store, the button should make an API call to retrieve the data. Once the data is retrieved, it should then outline a row by row comparison on what new data will be added to the database, what will be removed and what will be modified.
    - Allow the user to press confirm or discard, if a user confirms it, store the data into the database cache.