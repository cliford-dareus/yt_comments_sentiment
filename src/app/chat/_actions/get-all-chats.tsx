"use server"

import { db } from "@/lib/db";
import { $chats } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

type QueryChatProps = {
  offset: number;
  limit: number;
  sort: string | string[] | undefined;
  userId: string;
};

const getAllChats = async ({ offset, limit, sort, userId }: QueryChatProps) => {
  const chat = (await db
    .select()
    .from($chats)
    .offset(offset)
    .limit(limit)
    .where(eq($chats.userId, userId))).sort();

  const len = await db
    .select({ fileName: $chats.fileName, count: sql<number>`cast(count(${$chats.fileName}) as int)` })
    .from($chats)
    .groupBy($chats.fileName)
    .where(eq($chats.userId, userId));

  return [chat, len[0].count];
};

export default getAllChats;
