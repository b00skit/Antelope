CREATE TABLE `activity_roster_sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_roster_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`character_ids_json` text DEFAULT '[]',
	`order` integer DEFAULT 0,
	FOREIGN KEY (`activity_roster_id`) REFERENCES `activity_rosters`(`id`) ON UPDATE no action ON DELETE cascade
);
