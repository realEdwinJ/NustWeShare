CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE TYPE "public"."curriculum_status" AS ENUM('active', 'phase_in', 'phasing_out', 'archived');--> statement-breakpoint
CREATE TYPE "public"."programme_level" AS ENUM('certificate', 'diploma', 'bachelor', 'honours', 'master', 'doctorate', 'other');--> statement-breakpoint
CREATE TYPE "public"."assessment_type" AS ENUM('TEST', 'EXAM', 'SUPPLEMENTARY', 'QUIZ', 'ASSIGNMENT', 'LAB', 'TUTORIAL');--> statement-breakpoint
CREATE TYPE "public"."paper_status" AS ENUM('active', 'deleted', 'pending');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('instagram', 'tiktok', 'x');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('duplicate', 'wrong_module', 'wrong_year', 'wrong_assessment_type', 'corrupted', 'not_paper', 'other');--> statement-breakpoint
CREATE TABLE "contribution_stats" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"approved_count" integer DEFAULT 0 NOT NULL,
	"pending_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"last_contribution_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curricula" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"programme_id" uuid NOT NULL,
	"label" varchar(200) NOT NULL,
	"code_version" varchar(30),
	"status" "curriculum_status" DEFAULT 'active' NOT NULL,
	"year_introduced" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faculties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faculties_code_unique" UNIQUE("code"),
	CONSTRAINT "faculties_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"faculty_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"code" varchar(20),
	"slug" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programmes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(300) NOT NULL,
	"level" "programme_level" NOT NULL,
	"nqf_level" integer,
	"nqf_credits" integer,
	"nqf_qualification_id" varchar(20),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(300) NOT NULL,
	"description" text,
	"department_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modules_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "programme_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"programme_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"curriculum_id" uuid NOT NULL,
	"year_level" integer,
	"semester" integer,
	"is_core" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_programme_module_curriculum" UNIQUE("programme_id","module_id","curriculum_id")
);
--> statement-breakpoint
CREATE TABLE "papers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"academic_year" integer NOT NULL,
	"semester" integer NOT NULL,
	"assessment_type" "assessment_type" NOT NULL,
	"assessment_number" integer,
	"status" "paper_status" DEFAULT 'active' NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deletion_reason" varchar(50),
	CONSTRAINT "chk_papers_semester" CHECK (semester IN (1,2)),
	CONSTRAINT "chk_papers_year" CHECK (academic_year BETWEEN 2000 AND 2035),
	CONSTRAINT "chk_papers_assessment_number" CHECK ((
        (assessment_type IN ('EXAM','SUPPLEMENTARY') AND assessment_number IS NULL) OR
        (assessment_type NOT IN ('EXAM','SUPPLEMENTARY') AND (assessment_number IS NULL OR assessment_number BETWEEN 1 AND 20))
      ))
);
--> statement-breakpoint
CREATE TABLE "paper_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_id" uuid NOT NULL,
	"r2_object_key" varchar(500) NOT NULL,
	"original_filename" varchar(300) NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(50) DEFAULT 'application/pdf' NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"page_count" integer,
	"text_fingerprint" varchar(64),
	"perceptual_hash" varchar(64),
	"is_canonical" boolean DEFAULT true NOT NULL,
	"uploader_id" uuid,
	"upload_ip_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paper_files_r2_object_key_unique" UNIQUE("r2_object_key"),
	CONSTRAINT "paper_files_sha256_unique" UNIQUE("sha256"),
	CONSTRAINT "chk_pf_file_size" CHECK (file_size > 0 AND file_size <= 3145728),
	CONSTRAINT "chk_pf_mime" CHECK (mime_type = 'application/pdf')
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"normalized_username" varchar(50) NOT NULL,
	"display_name" varchar(80) NOT NULL,
	"pin_hash" varchar(200) NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_normalized_username_unique" UNIQUE("normalized_username")
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"handle" varchar(80) NOT NULL,
	"display_publicly" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"details" text,
	"reporter_id" uuid,
	"reporter_ip_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contribution_stats" ADD CONSTRAINT "contribution_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_modules" ADD CONSTRAINT "programme_modules_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_modules" ADD CONSTRAINT "programme_modules_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_modules" ADD CONSTRAINT "programme_modules_curriculum_id_curricula_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papers" ADD CONSTRAINT "papers_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_files" ADD CONSTRAINT "paper_files_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_files" ADD CONSTRAINT "paper_files_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_links" ADD CONSTRAINT "social_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_stats_approved" ON "contribution_stats" USING btree ("approved_count");--> statement-breakpoint
CREATE INDEX "idx_curricula_programme_id" ON "curricula" USING btree ("programme_id");--> statement-breakpoint
CREATE INDEX "idx_curricula_status" ON "curricula" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_departments_school_id" ON "departments" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_departments_slug" ON "departments" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_faculties_slug" ON "faculties" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_schools_faculty_id" ON "schools" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "idx_schools_slug" ON "schools" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_programmes_department_id" ON "programmes" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_programmes_code" ON "programmes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_programmes_level" ON "programmes" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_modules_code" ON "modules" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_modules_name" ON "modules" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_pm_programme_id" ON "programme_modules" USING btree ("programme_id");--> statement-breakpoint
CREATE INDEX "idx_pm_module_id" ON "programme_modules" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "idx_pm_curriculum_id" ON "programme_modules" USING btree ("curriculum_id");--> statement-breakpoint
CREATE INDEX "idx_pm_year_level" ON "programme_modules" USING btree ("year_level");--> statement-breakpoint
CREATE INDEX "idx_papers_module_id" ON "papers" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "idx_papers_year" ON "papers" USING btree ("academic_year");--> statement-breakpoint
CREATE INDEX "idx_papers_status" ON "papers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_papers_module_year" ON "papers" USING btree ("module_id","academic_year");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_paper_identity_active" ON "papers" USING btree ("module_id","academic_year","semester","assessment_type","assessment_number") WHERE status = 'active';--> statement-breakpoint
CREATE INDEX "idx_pf_paper_id" ON "paper_files" USING btree ("paper_id");--> statement-breakpoint
CREATE INDEX "idx_pf_sha256" ON "paper_files" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "idx_pf_text_fp" ON "paper_files" USING btree ("text_fingerprint");--> statement-breakpoint
CREATE INDEX "idx_pf_uploader" ON "paper_files" USING btree ("uploader_id");--> statement-breakpoint
CREATE INDEX "idx_pf_canonical" ON "paper_files" USING btree ("is_canonical");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_normalized" ON "users" USING btree ("normalized_username");--> statement-breakpoint
CREATE INDEX "idx_users_username" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_social_user_id" ON "social_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_social_platform" ON "social_links" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "idx_reports_paper_id" ON "reports" USING btree ("paper_id");--> statement-breakpoint
CREATE INDEX "idx_reports_reason" ON "reports" USING btree ("reason");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reports_paper_reporter" ON "reports" USING btree ("paper_id","reporter_id") WHERE reporter_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reports_paper_ip" ON "reports" USING btree ("paper_id","reporter_ip_hash") WHERE reporter_ip_hash IS NOT NULL;