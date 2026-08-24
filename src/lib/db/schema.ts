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
  sentimentScore: integer("sentiment_score"), // 0-100 confidence-ish score from model
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type UserType = typeof $user.$inferInsert;
export type SessionType = typeof $session.$inferInsert;
export type ChatType = typeof $chats.$inferInsert;
export type MessageType = typeof $message.$inferSelect;
export type SentimentType = typeof $sentiment.$inferSelect;
export type CommentType = typeof $comments.$inferSelect;
