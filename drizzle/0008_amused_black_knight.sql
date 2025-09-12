CREATE TABLE `forum_api_cache` (
	`activity_roster_id` integer PRIMARY KEY NOT NULL,
	`data` text,
	`last_sync_timestamp` integer,
	FOREIGN KEY (`activity_roster_id`) REFERENCES `activity_rosters`(`id`) ON UPDATE no action ON DELETE cascade
);
