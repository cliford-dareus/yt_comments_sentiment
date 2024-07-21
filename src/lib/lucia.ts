import { db } from "./db";
import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { session, user } from "./db/schema";

const adapter = new DrizzlePostgreSQLAdapter(db, session, user)

export const lucia = new Lucia(adapter, {
  sessionCookie : {
    name: "yt-comment-feel",
    expires: false,
    attributes: {
      secure: process.env.NODE_ENV === "production"
    }
  }
});

