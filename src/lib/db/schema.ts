import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";

export const userSystemEnum = pgEnum("user_system_enum", [
  "system",
  "user",
  "assistant",
]);

export const sentimentLabelEnum = pgEnum("sentiment_label", [
  "positive",
  "negative",
  "neutral",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "fetching",
  "labeling",
  "indexing",
  "completed",
  "failed",
]);

export const triageStatusEnum = pgEnum("triage_status", [
  "open",
  "drafted",
  "done",
  "skipped",
]);

export const $user = pgTable("user", {
  id: text("id").primaryKey(),
  fullName: text("full_name"),
  email: text("email").notNull(),
  picture: text("picture").default(""),
});

export const $session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => $user.id),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
});

export const $chats = pgTable("chats", {
  id: text("id").primaryKey(),
  fileId: text("file_id"),
  fileName: text("file_name"),
  videoId: text("video_id"),
  userId: text("user_id")
    .notNull()
    .references(() => $user.id),
});

export const $message = pgTable("messages", {
  id: text("id").primaryKey(),
  chatId: text("chat_id")
    .references(() => $chats.id)
    .notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  role: userSystemEnum("role").notNull(),
});

export const $sentiment = pgTable("sentiment", {
  id: text("id").primaryKey(),
  chatId: text("chat_id")
    .references(() => $chats.id)
    .notNull(),
  content: text("content"),
});

export const $comments = pgTable("comments", {
  id: text("id").primaryKey(),
  chatId: text("chat_id")
    .references(() => $chats.id)
    .notNull(),
  youtubeCommentId: text("youtube_comment_id"),
  authorDisplayName: text("author_display_name"),
  text: text("text").notNull(),
  likeCount: integer("like_count").default(0),
  publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
  sentimentLabel: sentimentLabelEnum("sentiment_label"),
  sentimentScore: integer("sentiment_score"),
  replyDraft: text("reply_draft"),
  /** Theme cluster key (e.g. audio, pacing, sponsorship). */
  themeKey: text("theme_key"),
  triageStatus: triageStatusEnum("triage_status"),
  triagePriority: integer("triage_priority"),
  triageReason: text("triage_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Aggregated issue/praise themes for a video project. */
export const $themeClusters = pgTable("theme_clusters", {
  id: text("id").primaryKey(),
  chatId: text("chat_id")
    .notNull()
    .references(() => $chats.id),
  themeKey: text("theme_key").notNull(),
  label: text("label").notNull(),
  polarity: text("polarity").default("negative"),
  commentCount: integer("comment_count").notNull().default(0),
  likeWeight: integer("like_weight").notNull().default(0),
  summary: text("summary"),
  exampleCommentIds: text("example_comment_ids"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const $jobs = pgTable("analysis_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => $user.id),
  chatId: text("chat_id").references(() => $chats.id),
  videoInput: text("video_input").notNull(),
  videoId: text("video_id"),
  status: jobStatusEnum("status").notNull().default("pending"),
  progress: integer("progress").notNull().default(0),
  stepLabel: text("step_label").default("Queued"),
  error: text("error"),
  commentCount: integer("comment_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const $youtubeQuota = pgTable("youtube_quota_usage", {
  day: text("day").primaryKey(),
  unitsUsed: integer("units_used").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const $channelScans = pgTable("channel_scans", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => $user.id),
  channelId: text("channel_id").notNull(),
  channelTitle: text("channel_title"),
  channelInput: text("channel_input").notNull(),
  status: jobStatusEnum("status").notNull().default("pending"),
  progress: integer("progress").notNull().default(0),
  stepLabel: text("step_label").default("Queued"),
  error: text("error"),
  videoCount: integer("video_count").default(0),
  narrative: text("narrative"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const $channelScanVideos = pgTable("channel_scan_videos", {
  id: text("id").primaryKey(),
  scanId: text("scan_id")
    .notNull()
    .references(() => $channelScans.id),
  videoId: text("video_id").notNull(),
  title: text("title"),
  publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
  viewCount: integer("view_count"),
  sampleSize: integer("sample_size").default(0),
  positivePct: integer("positive_pct"),
  negativePct: integer("negative_pct"),
  neutralPct: integer("neutral_pct"),
  healthScore: integer("health_score"),
  sortOrder: integer("sort_order").default(0),
});

export type UserType = typeof $user.$inferInsert;
export type SessionType = typeof $session.$inferInsert;
export type ChatType = typeof $chats.$inferInsert;
export type MessageType = typeof $message.$inferSelect;
export type SentimentType = typeof $sentiment.$inferSelect;
export type CommentType = typeof $comments.$inferSelect;
export type JobType = typeof $jobs.$inferSelect;
export type ChannelScanType = typeof $channelScans.$inferSelect;
export type ChannelScanVideoType = typeof $channelScanVideos.$inferSelect;
export type ThemeClusterType = typeof $themeClusters.$inferSelect;
