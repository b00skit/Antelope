CREATE TABLE `activity_roster_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`faction_id` integer NOT NULL,
	`source_roster_id` integer NOT NULL,
	`name` text(255) NOT NULL,
	`created_by` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`data_json` text NOT NULL,
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_roster_id`) REFERENCES `activity_rosters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
