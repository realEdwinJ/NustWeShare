CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"paper_id" uuid,
	"module_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_bookmarks_target" CHECK ((paper_id IS NOT NULL) <> (module_id IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "paper_request_votes" (
	"request_id" uuid NOT NULL,
	"voter_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paper_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"academic_year" integer,
	"assessment_type" "assessment_type",
	"note" varchar(200),
	"requester_id" uuid,
	"requester_ip_hash" varchar(64),
	"votes" integer DEFAULT 1 NOT NULL,
	"fulfilled_paper_id" uuid,
	"fulfilled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "paper_files" ADD COLUMN "hide_uploader" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" varchar(280);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_color" varchar(20) DEFAULT 'indigo' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_emoji" varchar(16);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "programme_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "study_year" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "public_profile" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_on_leaderboard" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "upload_anonymously" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferences" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(20) DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_request_votes" ADD CONSTRAINT "paper_request_votes_request_id_paper_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."paper_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_requests" ADD CONSTRAINT "paper_requests_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_requests" ADD CONSTRAINT "paper_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_requests" ADD CONSTRAINT "paper_requests_fulfilled_paper_id_papers_id_fk" FOREIGN KEY ("fulfilled_paper_id") REFERENCES "public"."papers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bookmarks_user" ON "bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_bookmarks_user_paper" ON "bookmarks" USING btree ("user_id","paper_id") WHERE paper_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_bookmarks_user_module" ON "bookmarks" USING btree ("user_id","module_id") WHERE module_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_request_vote" ON "paper_request_votes" USING btree ("request_id","voter_hash");--> statement-breakpoint
CREATE INDEX "idx_requests_module" ON "paper_requests" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "idx_requests_votes" ON "paper_requests" USING btree ("votes");