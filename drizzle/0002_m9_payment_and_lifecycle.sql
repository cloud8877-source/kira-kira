ALTER TABLE `bills` ADD `payment_qr_key` text;--> statement-breakpoint
ALTER TABLE `bills` ADD `payment_qr_mime` text;--> statement-breakpoint
ALTER TABLE `bills` ADD `payment_qr_uploaded_at` integer;--> statement-breakpoint
ALTER TABLE `bills` ADD `payment_instructions` text;--> statement-breakpoint
ALTER TABLE `bills` ADD `settled_at` integer;--> statement-breakpoint
ALTER TABLE `bills` ADD `expires_at` integer;--> statement-breakpoint
ALTER TABLE `participants` ADD `transfer_proof_key` text;--> statement-breakpoint
ALTER TABLE `participants` ADD `transfer_proof_mime` text;--> statement-breakpoint
ALTER TABLE `participants` ADD `transfer_proof_uploaded_at` integer;