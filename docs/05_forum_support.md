# **App Name**: Forum Support

## Backend Setup:
- Ensure the factions table has two new columns 'phpbb_api_url' and 'phpbb_api_key' both nullable.

## Instructions:
- Only do the implementation in phases, as provided by the developer. You may read the other phases for context but don't worry about implementation of other phases.

### Phase 1:
- On the faction enrollment and faction management page, add an input group for the PhpBB Forum URL and PhpBB API Key, below said input group explain that the forum requires booskit's api extension which can be downloaded here: https://github.com/b00skit/phpbb-api-extension/
- Explain that the section is optional and it'll enable forum-integration features for the faction.
- Below said inputs, there should be a REST API Endpoint preview which is basically a live input of the two fields, say a user fills out the first field as: https://app.booskit.dev/phpbb/ and the second field as abcphptest then the REST API Endpoint Preview should be
https://app.booskit.dev/phpbb/app.php/booskit/phpbbapi/groups?key=abcphptest

### Phase 2:
- On the activity rosters, add a new json variables called forum_groups_included & forum_groups_excluded which is only available / parsed if there's a phpbb link & api key.
- If there's a forum_groups_included or forum_groups_excluded call then the activity roster should only filter by forum username all those users which the API has returned, for that make a app.php/booskit/phpbbapi/group/[id] call.
- If there's any forum usernames that don't match up with the data from the gtaw api, then you should list those users below the actual roster (variable alert_forum_users_missing must be set to true).

### Phase 3:
- add the ability to also include / exclude specific forum users by id, to include you can simply make a app.php/booskit/phpbbapi/user/{id} call.

### Phase 4:
- add a section for forum information on the character-sheets, you should make a call as such app.php/booskit/phpbbapi/user/username/{username} to retrieve the user information.

## Examples:
Group call:
/booskit/phpbbapi/group/[id]
{
  "group": {
    "id": 1,
    "name": "GUESTS",
    "type": 3,
    "desc": "",
    "leaders": [],
    "members": [
      {
        "id": 1,
        "username": "Anonymous",
        "email": ""
      }
    ],
    "counts": {
      "leaders": 0,
      "members": 1,
      "total": 1
    }
  }
}

User call:
{
  "user": {
    "id": 2,
    "username": "admin",
    "email": "phpbb@booskit.dev",
    "groups": [
      {
        "id": 5,
        "name": "ADMINISTRATORS",
        "leader": true
      },
      {
        "id": 4,
        "name": "GLOBAL_MODERATORS",
        "leader": false
      },
      {
        "id": 2,
        "name": "REGISTERED",
        "leader": false
      }
    ],
    "counts": {
      "groups": 3
    }
  }
}