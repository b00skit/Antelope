CREATE TABLE `api_forum_syncable_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`faction_id` integer NOT NULL,
	`group_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	`created_by` integer NOT NULL,
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_factions` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`access_rank` integer DEFAULT 15,
	`administration_rank` integer DEFAULT 15,
	`supervisor_rank` integer DEFAULT 10,
	`minimum_abas` real DEFAULT 0,
	`minimum_supervisor_abas` real DEFAULT 0,
	`feature_flags` text DEFAULT '{"activity_rosters_enabled":true,"character_sheets_enabled":true,"statistics_enabled":true,"units_divisions_enabled":false,"data_exports_enabled":false}',
	`phpbb_api_url` text,
	`phpbb_api_key` text
);
--> statement-breakpoint
INSERT INTO `__new_factions`("id", "name", "color", "access_rank", "administration_rank", "supervisor_rank", "minimum_abas", "minimum_supervisor_abas", "feature_flags", "phpbb_api_url", "phpbb_api_key") SELECT "id", "name", "color", "access_rank", "administration_rank", "supervisor_rank", "minimum_abas", "minimum_supervisor_abas", "feature_flags", "phpbb_api_url", "phpbb_api_key" FROM `factions`;--> statement-breakpoint
DROP TABLE `factions`;--> statement-breakpoint
ALTER TABLE `__new_factions` RENAME TO `factions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;