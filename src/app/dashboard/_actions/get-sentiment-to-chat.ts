"use server";

import { getUser } from "@/lib/auth";
import {
  labelCommentsForChat,
  buildOverallSummary,
} from "@/lib/analyze-comments";

export const getSentimentToChat = async ({
  file_name,
  chatId,
}: {
  file_name?: string;
  chatId: string;
}) => {
  const user = await getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  if (!chatId) {
    return { error: "chatId is required" };
  }

  try {
    // 1) Label each comment in Postgres
    const labelResult = await labelCommentsForChat(chatId);

    // 2) Narrative summary from labeled set
    const summary = await buildOverallSummary(chatId);

    if ("error" in summary && summary.error) {
      return { error: summary.error };
    }

    return {
      analysis: summary.analysis,
      stats: summary.stats,
      labeled: labelResult.labeled,
      total: labelResult.total,
    };
  } catch (err) {
    console.error("Error in getSentimentToChat:", err);
    return { error: "Failed to analyze sentiment" };
  }
};
