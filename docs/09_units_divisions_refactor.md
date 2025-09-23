# **App Name**: Units & Divisions Refactor

## Backend Setup:
- Modify the schema: Create columns forum_group_id in faction_organization_cat2 and faction_organization_cat3, make them nullable.
- Add to the schema: Create tables faction_organization_cat2_sections and faction_organization_cat3_sections, which should have the same structure as activity_roster_sections but adapted for cat2 and cat3 respectively.
- Modify the schema: Modify the faction_organization_membership table and add a column called "manual" which should be a boolean.
- Creat e schema: Create table faction_organization_cat2_snapshots and faction_organization_cat3_sections, respectively.

## Instructions:
- Only do the implementation in phases, as provided by the developer. You may read the other phases for context but don't worry about implementation of other phases.

### Phase 1:
- Perform the backend setup.
- Within the faction settings and faction enrollment page, ensure that Units & Divisions can only be enabled when a Forum Key and Forum URL is not empty.

### Phase 2:
- We'll be refactoring the way Categories in Units & Divisions, category 1 should be left as-is, category 2 and category 3 and the membership display should have the same functionality as the activity roster, and should always filter their data based on the forum group (if set), if not set, then the membership should be empty until filled manually.
- Remove the ability to sync forum groups, instead, it should all be done via sync management (add a new section in the sync management), that compares the forum group cache with the current roster setup and adds any missing people and removes any other people that aren't part of the forum group. If there is no cache for that group, disable the button and add a tooltip that the forum groups have to be synced via sync management. Pressing Refresh Roster should add everyone to faction_organization_membership (loading from cache) as long as they meet the criteria.

### Phase 3:
- When creating cat2 and cat3 rosters, make sure you make a dropdown for selecting the forum group for the roster. Do the same for modifying said rosters.
- Make sure you add the same settings as available in activity rosters (apart from filtering): Mark alternative characters, Snapshots, Labels, stuff like that.

### Phase 4:
- Add support for sections in cat2 and cat3 rosters, as well as mass actions such mass moving people to a section and mass labling.

### Phase 5:
- Add support for snapshots in cat2 and cat3 rosters.

### Phase 6:
- Add a new option in activity rosters, if the Units & Divisions are setup and enabled, that you can select which cat2 or cat3 you wish to include in the activity roster.

### Phase 7:
- Double check all the phases and ensure that the implementation is as described, make any functional changes and any code refactors to ensure smooth working.