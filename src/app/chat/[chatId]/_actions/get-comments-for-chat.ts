"use server";

import { db } from "@/lib/db";
import { $comments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCommentStats } from "@/lib/analyze-comments";

export async function getCommentsForChat(chatId: string) {
  if (!chatId) return { comments: [], stats: null };

  const [comments, stats] = await Promise.all([
    db
      .select({
        id: $comments.id,
        text: $comments.text,
        authorDisplayName: $comments.authorDisplayName,
        likeCount: $comments.likeCount,
        publishedAt: $comments.publishedAt,
        sentimentLabel: $comments.sentimentLabel,
        sentimentScore: $comments.sentimentScore,
      })
      .from($comments)
      .where(eq($comments.chatId, chatId))
      .orderBy(desc($comments.likeCount)),
    getCommentStats(chatId),
  ]);

  return { comments, stats };
}
