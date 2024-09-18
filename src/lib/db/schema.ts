import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

export const userSystemEnum = pgEnum("user_system_enum", ["system", "user"]);

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
  userId: text("user_id")
    .notNull()
    .references(() => $user.id),
});

export const $message = pgTable("messages", {
  id: text("id").primaryKey(),
  chatId: integer("chat_id")
    .references(() => $chats.id)
    .notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  role: userSystemEnum("role").notNull(),
});

export type UserType = typeof $user.$inferInsert;
export type SessionType = typeof $session.$inferInsert;
export type ChatType = typeof $chats.$inferInsert;
