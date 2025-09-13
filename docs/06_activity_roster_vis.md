# **App Name**: Activity Roster Visibility

## Backend Setup:
- Ensure the activity_rosters table has two new columns 'visibility' and 'password' (password is nullable). The 'is_public' column is to be removed.

## Instructions:
- Only do the implementation in phases, as provided by the developer. You may read the other phases for context but don't worry about implementation of other phases.

### Phase 1:
- On the interface to create / edit rosters, ensure you change the visibility area into a dropdown for the four different types of visibilities:
there should be 4 visibility types "personal" (only the person that created it can see it) "private" (the roster is protected by a password) "unlisted" (the roster is not visible on the roster table for anyone but it's creator) "public" (the same public functionality as now)

### Phase 2:
- create a new table called activity_roster_access table with id, user_id, activity_roster_id

### Phase 3:
- Ensure that the activity-rosters table is updated to adapt to the new listings, so it should work as follows:
- Public - Anyone can see it.
- Private - Anyone can see it (access will be handled in phase 4).
- Unlisted - Only owner can see it.
- Personal - Only owner can see it.

### Phase 4:
- if a user accesses a private roster, then it'll ask them for a password (regardless of if you're the owner or not), you need to put in the correct password to access it, once the password is correct, add them to the activity_roster_access table.