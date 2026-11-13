"use server";

import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { $chats } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { generateGrowthAdvice, type GrowthAdvice } from "@/lib/growth-coach";

export type { GrowthAdvice };

export async function getGrowthAdviceAction(chatId: string): Promise<
  | { advice: GrowthAdvice }
  | { error: string }
> {
  const user = await getUser();
  if (!user) return { error: "Unauthorized" };
  if (!chatId) return { error: "chatId is required" };

  const chat = await db
    .select({ id: $chats.id })
    .from($chats)
    .where(and(eq($chats.id, chatId), eq($chats.userId, user.id)))
    .limit(1);

  if (!chat.length) return { error: "Project not found" };

  return generateGrowthAdvice(chatId);
}
