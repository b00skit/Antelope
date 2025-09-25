CREATE TABLE `faction_audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`faction_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`category` text NOT NULL,
	`action` text NOT NULL,
	`details` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
