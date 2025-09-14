# **App Name**: Units & Divisions

## Backend Setup:
- Create a faction_organization_settings table, it should have the faction_id, category_1_name, category_2_name, category_3_name
- Create a faction_organization_cat1 table, it should have id, faction_id, name, short_name, access_json, created_by, created_at, updated_at
- Create a faction_organization_cat2 table, it should have id, faction_id, cat1_id, name, short_name, access_json, settings_json, created_by, created_at, updated_at
- Create a faction_organization_cat3 table, it should have id, faction_id, cat2_id, name, short_name, access_json, settings_json, created_by, created_at, updated_at
- Create a faction_organization_membership table, it should have id, type (either: cat_1 or cat_2), category_id, character_id, title (nullable), created_by, created_at, updated_at

## Instructions:

- Only do the implementation in phases, as provided by the developer. You may read the other phases for context but don't worry about implementation of other phases.

### Phase 1:
- Create a feature flag for factions to enable Units & Divisions, if enabled, it should show a Units & Divisions tab in the faction panel.
- The Units & Divisions page should display: faction_organization_cat1's as large cards, listed inside of them should be faction_organization_cat2's within each row. if the faction_organization_settings is not setup for the faction, display a message that says the admin has to setup the organizational settings.
- If the user has administration_rank access, add a button which says "Faction Organizational Settings" which allows you to set the name of category_1_name (default: Division), category_2_name (default: Unit), category_3_name (default: Detail).

### Phase 2:
- If the user has administration_rank access, show a button that says "Create (cat_1_name)" on the main page of the units & divisions page. This should open a prompt to create a Category 1.
- The create page should have the ability to give OTHER FACTION USERS access (appends to access_json), as well as fill out all the fields.
- Everyone should see the listings, access depends on them being able to edit the listing or not.
- Once created if the user has administration_rank access (regardless of being added to access_json), they should have the ability to modify & delete.
- Once created if the user has access_json access, they should have the ability to modify & delete.

### Phase 2:
- Within each of the category_1 listings, you should show a button (to administration_rank or access_json) called "Create (cat_2_name)", this should open a pop-up that creates a category_2, the settings_json should have the ability to determine if category 3's are allowed. Each category 2 should then be accessible via the page.
- When the category_2 page is open, ensure the people have the ability to modify and edit the category_2 based on having access to it or administration_rank to it.

### Phase 3:
- Within a category_2, allow for people that have either administration_rank or access_json to add or remove people based on their character name (from the cache), then save the people into faction_organization_membership. Inside of a category_2, you should have a full list of people added to said faction (regardless of administration_rank and access_json), with the ability to remove people as well as edit each of the people's titles (required access).

### Phase 4:
- If a category_3 is enabled, then show the ability to create a category_3, the ability to add people to the category should work the same way as well as showing people in the category.

### Phase 5:
- You should have the ability to move people into different categories as long as it's either a sub category or into the main category (thats not cat1, so people can be moved to cat2 or other cat3s that are part of that cat2).

### Phase 6:
- You should have the ability to set a forum_grop in the category's settings (cat2 and cat3), add a sync forum group then add all character_ids to faction_organization_membership (add from cache directly).