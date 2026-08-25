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

/** Overall narrative summary for a project (Gemini write-up). */
export const $sentiment = pgTable("sentiment", {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
        .references(() => $chats.id)
        .notNull(),
    content: text("content"),
});

/** Individual YouTube comments stored in Postgres. */
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
    /** Creator-chosen reply draft (editable, persisted). */
    replyDraft: text("reply_draft"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Background analysis jobs (fetch → label → index). */
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

/** Daily YouTube Data API unit tracking (approx). */
export const $youtubeQuota = pgTable("youtube_quota_usage", {
    day: text("day").primaryKey(),
    unitsUsed: integer("units_used").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserType = typeof $user.$inferInsert;
export type SessionType = typeof $session.$inferInsert;
export type ChatType = typeof $chats.$inferInsert;
export type MessageType = typeof $message.$inferSelect;
export type SentimentType = typeof $sentiment.$inferSelect;
export type CommentType = typeof $comments.$inferSelect;
export type JobType = typeof $jobs.$inferSelect;
