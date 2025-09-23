CREATE TABLE `faction_organization_cat2_sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`character_ids_json` text DEFAULT '[]',
	`order` integer DEFAULT 0,
	`configuration_json` text,
	FOREIGN KEY (`category_id`) REFERENCES `faction_organization_cat2`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `faction_organization_cat2_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`faction_id` integer NOT NULL,
	`source_category_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_by` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`data_json` text NOT NULL,
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_category_id`) REFERENCES `faction_organization_cat2`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faction_organization_cat3_sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`character_ids_json` text DEFAULT '[]',
	`order` integer DEFAULT 0,
	`configuration_json` text,
	FOREIGN KEY (`category_id`) REFERENCES `faction_organization_cat3`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `faction_organization_cat3_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`faction_id` integer NOT NULL,
	`source_category_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_by` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`data_json` text NOT NULL,
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_category_id`) REFERENCES `faction_organization_cat3`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `faction_organization_cat2` ADD `forum_group_id` integer;--> statement-breakpoint
ALTER TABLE `faction_organization_cat3` ADD `forum_group_id` integer;--> statement-breakpoint
ALTER TABLE `faction_organization_membership` ADD `manual` integer DEFAULT false NOT NULL;