CREATE TABLE `faction_members_abas_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`faction_id` integer NOT NULL,
	`abas` text,
	`last_sync_timestamp` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `faction_members_abas_cache_character_id_faction_id_unique` ON `faction_members_abas_cache` (`character_id`,`faction_id`);