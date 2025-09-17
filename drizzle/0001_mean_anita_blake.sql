CREATE TABLE `activity_roster_labels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_roster_id` integer NOT NULL,
	`character_id` integer NOT NULL,
	`color` text NOT NULL,
	FOREIGN KEY (`activity_roster_id`) REFERENCES `activity_rosters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roster_character_label_unique_idx` ON `activity_roster_labels` (`activity_roster_id`,`character_id`);