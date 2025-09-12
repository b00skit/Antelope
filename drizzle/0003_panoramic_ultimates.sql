CREATE TABLE `faction_members_cache` (
	`faction_id` integer PRIMARY KEY NOT NULL,
	`members` text,
	`last_sync_timestamp` integer
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_factions` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`access_rank` integer DEFAULT 15,
	`moderation_rank` integer DEFAULT 15,
	`feature_flags` text DEFAULT '{"activity_rosters_enabled":true,"character_sheets_enabled":true}'
);
--> statement-breakpoint
INSERT INTO `__new_factions`("id", "name", "color", "access_rank", "moderation_rank", "feature_flags") SELECT "id", "name", "color", "access_rank", "moderation_rank", "feature_flags" FROM `factions`;--> statement-breakpoint
DROP TABLE `factions`;--> statement-breakpoint
ALTER TABLE `__new_factions` RENAME TO `factions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;