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
CREATE UNIQUE INDEX `users_gtaw_user_id_unique` ON `users` (`gtaw_user_id`);--> statement-breakpoint
CREATE TABLE `factions` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`access_rank` integer DEFAULT 15,
	`administration_rank` integer DEFAULT 15,
	`supervisor_rank` integer DEFAULT 10,
	`minimum_abas` real DEFAULT 0,
	`minimum_supervisor_abas` real DEFAULT 0,
	`feature_flags` text DEFAULT '{"activity_rosters_enabled":true,"character_sheets_enabled":true,"statistics_enabled":true,"units_divisions_enabled":false}',
	`phpbb_api_url` text,
	`phpbb_api_key` text
);
--> statement-breakpoint
CREATE TABLE `faction_users` (
	`user_id` integer NOT NULL,
	`faction_id` integer NOT NULL,
	`rank` integer NOT NULL,
	`joined` integer DEFAULT false,
	PRIMARY KEY(`user_id`, `faction_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE no action
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
	`configuration_json` text,
	FOREIGN KEY (`activity_roster_id`) REFERENCES `activity_rosters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `api_cache_factions` (
	`faction_id` integer PRIMARY KEY NOT NULL,
	`members` text,
	`last_sync_timestamp` integer
);
--> statement-breakpoint
CREATE TABLE `api_cache_abas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`faction_id` integer NOT NULL,
	`abas` text,
	`total_abas` integer,
	`last_sync_timestamp` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_cache_abas_character_id_faction_id_unique` ON `api_cache_abas` (`character_id`,`faction_id`);--> statement-breakpoint
CREATE TABLE `api_cache_forums` (
	`activity_roster_id` integer PRIMARY KEY NOT NULL,
	`data` text,
	`last_sync_timestamp` integer,
	FOREIGN KEY (`activity_roster_id`) REFERENCES `activity_rosters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `faction_organization_cat1` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`faction_id` integer NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`access_json` text,
	`created_by` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faction_organization_cat2` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`faction_id` integer NOT NULL,
	`cat1_id` integer NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`access_json` text,
	`settings_json` text,
	`created_by` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cat1_id`) REFERENCES `faction_organization_cat1`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faction_organization_cat3` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`faction_id` integer NOT NULL,
	`cat2_id` integer NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`access_json` text,
	`settings_json` text,
	`created_by` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cat2_id`) REFERENCES `faction_organization_cat2`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faction_organization_membership` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`category_id` integer NOT NULL,
	`character_id` integer NOT NULL,
	`title` text,
	`secondary` integer DEFAULT false,
	`created_by` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faction_organization_settings` (
	`faction_id` integer PRIMARY KEY NOT NULL,
	`category_1_name` text DEFAULT 'Division',
	`category_2_name` text DEFAULT 'Unit',
	`category_3_name` text DEFAULT 'Detail',
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `organization_favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`faction_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`category_type` text NOT NULL,
	`category_name` text NOT NULL,
	`category_path` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `setup` (
	`completed` integer PRIMARY KEY DEFAULT false NOT NULL
);
