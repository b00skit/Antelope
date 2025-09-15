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
