CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text(255) NOT NULL,
	`password` text(255),
	`gtaw_user_id` integer,
	`last_sync_timestamp` integer,
	`selected_faction_id` integer,
	`role` text(255) DEFAULT 'guest' NOT NULL,
	FOREIGN KEY (`selected_faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `factions` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`color` text(255),
	`access_rank` integer DEFAULT 15,
	`administration_rank` integer DEFAULT 15,
	`supervisor_rank` integer DEFAULT 10,
	`minimum_abas` real DEFAULT 0,
	`minimum_supervisor_abas` real DEFAULT 0,
	`feature_flags` text DEFAULT '{"activity_rosters_enabled":true,"character_sheets_enabled":true,"statistics_enabled":true,"units_divisions_enabled":false}',
	`phpbb_api_url` text(255),
	`phpbb_api_key` text(255)
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
CREATE TABLE `activity_rosters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`faction_id` integer NOT NULL,
	`name` text(255) NOT NULL,
	`roster_setup_json` text,
	`visibility` text DEFAULT 'personal' NOT NULL,
	`password` text(255),
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
	`activity_roster_name` text(255) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`activity_roster_id`) REFERENCES `activity_rosters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `activity_roster_sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_roster_id` integer NOT NULL,
	`name` text(255) NOT NULL,
	`description` text,
	`character_ids_json` text DEFAULT '[]',
	`order` integer DEFAULT 0,
	`configuration_json` text,
	FOREIGN KEY (`activity_roster_id`) REFERENCES `activity_rosters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `faction_members_cache` (
	`faction_id` integer PRIMARY KEY NOT NULL,
	`members` text,
	`last_sync_timestamp` integer
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
CREATE TABLE `forum_api_cache` (
	`activity_roster_id` integer PRIMARY KEY NOT NULL,
	`data` text,
	`last_sync_timestamp` integer,
	FOREIGN KEY (`activity_roster_id`) REFERENCES `activity_rosters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `faction_organization_cat1` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`faction_id` integer NOT NULL,
	`name` text(255) NOT NULL,
	`short_name` text(50),
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
	`name` text(255) NOT NULL,
	`short_name` text(50),
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
	`name` text(255) NOT NULL,
	`short_name` text(50),
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
	`title` text(255),
	`secondary` integer DEFAULT false,
	`created_by` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faction_organization_settings` (
	`faction_id` integer PRIMARY KEY NOT NULL,
	`category_1_name` text(255) DEFAULT 'Division',
	`category_2_name` text(255) DEFAULT 'Unit',
	`category_3_name` text(255) DEFAULT 'Detail',
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `organization_favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`faction_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`category_type` text NOT NULL,
	`category_name` text(255) NOT NULL,
	`category_path` text(255) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `setup` (
	`completed` integer PRIMARY KEY DEFAULT false
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_gtaw_user_id_unique` ON `users` (`gtaw_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `faction_members_abas_cache_character_id_faction_id_unique` ON `faction_members_abas_cache` (`character_id`,`faction_id`);