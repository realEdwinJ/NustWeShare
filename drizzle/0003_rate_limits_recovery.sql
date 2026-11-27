CREATE TABLE "rate_limits" (
	"key" varchar(160) PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "recovery_hash" varchar(200);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "recovery_created_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_rate_limits_reset" ON "rate_limits" USING btree ("reset_at");