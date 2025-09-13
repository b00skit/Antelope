CREATE TABLE `activity_roster_favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`faction_id` integer NOT NULL,
	`activity_roster_id` integer NOT NULL,
	`activity_roster_name` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`activity_roster_id`) REFERENCES `activity_rosters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_factions` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`access_rank` integer DEFAULT 15,
	`moderation_rank` integer DEFAULT 15,
	`supervisor_rank` integer DEFAULT 10,
	`minimum_abas` real DEFAULT 0,
	`minimum_supervisor_abas` real DEFAULT 0,
	`feature_flags` text DEFAULT '{"activity_rosters_enabled":true,"character_sheets_enabled":true,"statistics_enabled":true}',
	`phpbb_api_url` text,
	`phpbb_api_key` text
);
--> statement-breakpoint
INSERT INTO `__new_factions`("id", "name", "color", "access_rank", "moderation_rank", "supervisor_rank", "minimum_abas", "minimum_supervisor_abas", "feature_flags", "phpbb_api_url", "phpbb_api_key") SELECT "id", "name", "color", "access_rank", "moderation_rank", "supervisor_rank", "minimum_abas", "minimum_supervisor_abas", "feature_flags", "phpbb_api_url", "phpbb_api_key" FROM `factions`;--> statement-breakpoint
DROP TABLE `factions`;--> statement-breakpoint
ALTER TABLE `__new_factions` RENAME TO `factions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;