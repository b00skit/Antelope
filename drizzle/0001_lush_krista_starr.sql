CREATE TABLE `activity_rosters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`faction_id` integer NOT NULL,
	`name` text NOT NULL,
	`roster_setup_json` text,
	`is_public` integer DEFAULT false,
	`created_by` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
