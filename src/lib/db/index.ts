import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

let connection: postgres.Sql;

if (process.env.NODE_ENV === "production") {
  connection = postgres(process.env.DATABASE_URL, { prepare: false });
} else {
  const globalConnection = global as typeof globalThis & { connection: postgres.Sql };
  if (!globalConnection.connection) {
    globalConnection.connection = postgres(process.env.DATABASE_URL, { prepare: false });
  }
  connection = globalConnection.connection;
}

// const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(connection);