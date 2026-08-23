"use server";

import { db } from "@/lib/db";
import { $message } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function getChatMessages(chatId: string) {
  if (!chatId) return [];

  try {
    const rows = await db
      .select({
        id: $message.id,
        content: $message.content,
        role: $message.role,
        createdAt: $message.createdAt,
      })
      .from($message)
      .where(eq($message.chatId, chatId))
      .orderBy(asc($message.createdAt));

    // Map DB roles to AI SDK Message roles
    return rows.map((row) => ({
      id: row.id,
      content: row.content,
      role: (row.role === "assistant" ? "assistant" : "user") as
        | "user"
        | "assistant",
      createdAt: row.createdAt,
    }));
  } catch (error) {
    console.error("Failed to load chat messages:", error);
    return [];
  }
}
