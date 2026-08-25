DO $$ BEGIN
  CREATE TYPE "public"."job_status" AS ENUM(
    'pending', 'fetching', 'labeling', 'indexing', 'completed', 'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "analysis_jobs" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "chat_id" text,
  "video_input" text NOT NULL,
  "video_id" text,
  "status" "job_status" DEFAULT 'pending' NOT NULL,
  "progress" integer DEFAULT 0 NOT NULL,
  "step_label" text DEFAULT 'Queued',
  "error" text,
  "comment_count" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "analysis_jobs" ADD CONSTRAINT "analysis_jobs_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "analysis_jobs" ADD CONSTRAINT "analysis_jobs_chat_id_chats_id_fk"
    FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "analysis_jobs_user_id_idx" ON "analysis_jobs" ("user_id");
CREATE INDEX IF NOT EXISTS "analysis_jobs_status_idx" ON "analysis_jobs" ("status");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "youtube_quota_usage" (
  "day" text PRIMARY KEY NOT NULL,
  "units_used" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
