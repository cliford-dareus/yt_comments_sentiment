import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client);