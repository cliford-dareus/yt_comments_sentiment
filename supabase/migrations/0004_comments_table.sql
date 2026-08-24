-- Per-comment sentiment labels
DO $$ BEGIN
  CREATE TYPE "public"."sentiment_label" AS ENUM('positive', 'negative', 'neutral');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

ALTER TABLE "chats" ADD COLUMN IF NOT EXISTS "video_id" text;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "comments" (
  "id" text PRIMARY KEY NOT NULL,
  "chat_id" text NOT NULL,
  "youtube_comment_id" text,
  "author_display_name" text,
  "text" text NOT NULL,
  "like_count" integer DEFAULT 0,
  "published_at" timestamp with time zone,
  "sentiment_label" "sentiment_label",
  "sentiment_score" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "comments" ADD CONSTRAINT "comments_chat_id_chats_id_fk"
    FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "comments_chat_id_idx" ON "comments" ("chat_id");
CREATE INDEX IF NOT EXISTS "comments_sentiment_label_idx" ON "comments" ("sentiment_label");
