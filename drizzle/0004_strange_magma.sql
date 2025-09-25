CREATE TABLE `faction_organization_sync_exclusions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_type` text NOT NULL,
	`category_id` integer NOT NULL,
	`character_name` text(255) NOT NULL
);
