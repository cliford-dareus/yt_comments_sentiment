import { pgTable, serial, text, varchar, timestamp } from "drizzle-orm/pg-core";

export const $user = pgTable('user', {
  id: text('id').primaryKey(),
  fullName: text('full_name'),
  email: text('email').notNull(),
  picture: text('picture').default(''),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => $user.id),
	expiresAt: timestamp("expires_at", {
		withTimezone: true,
		mode: "date"
	}).notNull()
});

export type UserType = typeof $user.$inferInsert;