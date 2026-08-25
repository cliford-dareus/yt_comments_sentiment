"use server";

import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { $chats } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import {
  runSimilarVideoBenchmark,
  type BenchmarkResult,
} from "@/lib/benchmark";
import { extractVideoId } from "@/lib/fetch-youtube-comments";
import { QuotaExceededError } from "@/lib/youtube-quota";

export async function runBenchmarkAction(params: {
  chatId: string;
  /** Optional comma/space/newline-separated video URLs or IDs */
  manualPeers?: string;
}): Promise<{ result?: BenchmarkResult; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Unauthorized" };

  const chatId = params.chatId;
  if (!chatId) return { error: "chatId required" };

  const chats = await db
    .select()
    .from($chats)
    .where(and(eq($chats.id, chatId), eq($chats.userId, user.id)))
    .limit(1);

  if (!chats.length) return { error: "Chat not found" };

  const videoId = chats[0].videoId;
  if (!videoId) {
    return { error: "This project has no linked YouTube video ID" };
  }

  let manualVideoIds: string[] | undefined;
  if (params.manualPeers?.trim()) {
    const parts = params.manualPeers
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    manualVideoIds = parts
      .map((p) => extractVideoId(p) ?? (/^[a-zA-Z0-9_-]{11}$/.test(p) ? p : null))
      .filter((id): id is string => Boolean(id));
  }

  try {
    const result = await runSimilarVideoBenchmark({
      chatId,
      sourceVideoId: videoId,
      manualVideoIds,
    });
    return { result };
  } catch (err) {
    console.error("runBenchmarkAction error:", err);
    if (err instanceof QuotaExceededError) {
      return { error: err.message };
    }
    return {
      error: err instanceof Error ? err.message : "Benchmark failed",
    };
  }
}
