ALTER TABLE `activity_rosters` MODIFY COLUMN `visibility` enum('personal','private','unlisted','public','organization') NOT NULL DEFAULT 'personal';--> statement-breakpoint
ALTER TABLE `faction_organization_cat2` ADD `activity_roster_id` int;--> statement-breakpoint
ALTER TABLE `faction_organization_cat3` ADD `activity_roster_id` int;
