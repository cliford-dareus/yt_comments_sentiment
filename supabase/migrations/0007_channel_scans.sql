CREATE TABLE IF NOT EXISTS "channel_scans" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "channel_id" text NOT NULL,
  "channel_title" text,
  "channel_input" text NOT NULL,
  "status" "job_status" DEFAULT 'pending' NOT NULL,
  "progress" integer DEFAULT 0 NOT NULL,
  "step_label" text DEFAULT 'Queued',
  "error" text,
  "video_count" integer DEFAULT 0,
  "narrative" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "channel_scans" ADD CONSTRAINT "channel_scans_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "channel_scans_user_id_idx" ON "channel_scans" ("user_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "channel_scan_videos" (
  "id" text PRIMARY KEY NOT NULL,
  "scan_id" text NOT NULL,
  "video_id" text NOT NULL,
  "title" text,
  "published_at" timestamp with time zone,
  "view_count" integer,
  "sample_size" integer DEFAULT 0,
  "positive_pct" integer,
  "negative_pct" integer,
  "neutral_pct" integer,
  "health_score" integer,
  "sort_order" integer DEFAULT 0
);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "channel_scan_videos" ADD CONSTRAINT "channel_scan_videos_scan_id_channel_scans_id_fk"
    FOREIGN KEY ("scan_id") REFERENCES "public"."channel_scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "channel_scan_videos_scan_id_idx" ON "channel_scan_videos" ("scan_id");
