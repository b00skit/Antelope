CREATE TABLE `activity_roster_access` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`activity_roster_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`activity_roster_id`) REFERENCES `activity_rosters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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
CREATE TABLE `activity_roster_sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_roster_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`character_ids_json` text DEFAULT '[]',
	`order` integer DEFAULT 0,
	FOREIGN KEY (`activity_roster_id`) REFERENCES `activity_rosters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `activity_rosters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`faction_id` integer NOT NULL,
	`name` text NOT NULL,
	`roster_setup_json` text,
	`visibility` text DEFAULT 'personal' NOT NULL,
	`password` text,
	`created_by` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faction_members` (
	`user_id` integer NOT NULL,
	`faction_id` integer NOT NULL,
	`rank` integer NOT NULL,
	`joined` integer DEFAULT false,
	PRIMARY KEY(`user_id`, `faction_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faction_members_abas_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`faction_id` integer NOT NULL,
	`abas` text,
	`total_abas` integer,
	`last_sync_timestamp` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `faction_members_abas_cache_character_id_faction_id_unique` ON `faction_members_abas_cache` (`character_id`,`faction_id`);--> statement-breakpoint
CREATE TABLE `faction_members_cache` (
	`faction_id` integer PRIMARY KEY NOT NULL,
	`members` text,
	`last_sync_timestamp` integer
);
--> statement-breakpoint
CREATE TABLE `factions` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`access_rank` integer DEFAULT 15,
	`administration_rank` integer DEFAULT 15,
	`supervisor_rank` integer DEFAULT 10,
	`minimum_abas` real DEFAULT 0,
	`minimum_supervisor_abas` real DEFAULT 0,
	`feature_flags` text DEFAULT '{"activity_rosters_enabled":true,"character_sheets_enabled":true,"statistics_enabled":true}',
	`phpbb_api_url` text,
	`phpbb_api_key` text
);
--> statement-breakpoint
CREATE TABLE `forum_api_cache` (
	`activity_roster_id` integer PRIMARY KEY NOT NULL,
	`data` text,
	`last_sync_timestamp` integer,
	FOREIGN KEY (`activity_roster_id`) REFERENCES `activity_rosters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text,
	`gtaw_user_id` integer,
	`last_sync_timestamp` integer,
	`selected_faction_id` integer,
	`role` text DEFAULT 'guest' NOT NULL,
	FOREIGN KEY (`selected_faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_gtaw_user_id_unique` ON `users` (`gtaw_user_id`);