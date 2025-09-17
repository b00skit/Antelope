CREATE TABLE `api_cache_alternative_characters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`faction_id` integer NOT NULL,
	`character_name` text(255) NOT NULL,
	`rank` integer NOT NULL,
	`manually_set` integer DEFAULT false NOT NULL,
	`alternative_characters_json` text DEFAULT '[]'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_faction_alt_cache_unique_idx` ON `api_cache_alternative_characters` (`user_id`,`faction_id`);