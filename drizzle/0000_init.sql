CREATE TABLE `bills` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`total_cents` integer NOT NULL,
	`currency` text DEFAULT 'MYR' NOT NULL,
	`due_date` integer,
	`description` text,
	`admin_secret_hash` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`bill_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`amount_cents` integer NOT NULL,
	`status` text DEFAULT 'unpaid' NOT NULL,
	`note` text,
	`paid_at` integer,
	`confirmed_at` integer,
	FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `participants_bill_idx` ON `participants` (`bill_id`);