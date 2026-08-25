DO $$ BEGIN
  CREATE TYPE "triage_status" AS ENUM ('open', 'drafted', 'done', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "theme_key" text;
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "triage_status" "triage_status";
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "triage_priority" integer;
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "triage_reason" text;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "theme_clusters" (
  "id" text PRIMARY KEY NOT NULL,
  "chat_id" text NOT NULL,
  "theme_key" text NOT NULL,
  "label" text NOT NULL,
  "polarity" text DEFAULT 'negative',
  "comment_count" integer DEFAULT 0 NOT NULL,
  "like_weight" integer DEFAULT 0 NOT NULL,
  "summary" text,
  "example_comment_ids" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "theme_clusters" ADD CONSTRAINT "theme_clusters_chat_id_chats_id_fk"
    FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "theme_clusters_chat_id_idx" ON "theme_clusters" ("chat_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_chat_triage_idx" ON "comments" ("chat_id", "triage_status");
