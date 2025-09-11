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
CREATE TABLE `factions` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`access_rank` integer DEFAULT 15,
	`moderation_rank` integer DEFAULT 15
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text,
	`gtaw_user_id` integer,
	`last_sync_timestamp` integer,
	`selected_faction_id` integer,
	FOREIGN KEY (`selected_faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_gtaw_user_id_unique` ON `users` (`gtaw_user_id`);