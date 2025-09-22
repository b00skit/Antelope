ALTER TABLE `api_cache_forums` RENAME TO `_api_cache_forums_old`;--> statement-breakpoint
CREATE TABLE `api_cache_forums` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`data` text,
	`last_sync_timestamp` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_cache_forums_group_id_unique` ON `api_cache_forums` (`group_id`);--> statement-breakpoint
DROP TABLE `_api_cache_forums_old`;
