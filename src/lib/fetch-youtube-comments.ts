import { google } from "googleapis";
import { generateCSV } from "@/lib/utils";
import { uploadToSupabase } from "@/lib/supabase-bucket";
import { db } from "@/lib/db";
import { $chats, $comments } from "@/lib/db/schema";
import {
  assertQuotaAvailable,
  classifyYoutubeError,
  COMMENT_THREADS_LIST_COST,
  QuotaExceededError,
  recordQuotaUsage,
} from "@/lib/youtube-quota";

export const MAX_COMMENTS = Number(process.env.YOUTUBE_MAX_COMMENTS ?? 500);
/** Soft cap on API pages (100 comments each) to bound quota burn. */
export const MAX_PAGES = Math.ceil(MAX_COMMENTS / 100);

export function extractVideoId(input: string): string | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1).split("/")[0] || null;
    }
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "v") {
        return parts[1] || null;
      }
    }
  } catch {
    // not a valid URL
  }

  return null;
}

export type FetchCommentsResult = {
  chatId: string;
  file_key: string;
  file_name: string;
  commentCount: number;
  videoId: string;
  pagesFetched: number;
  quotaUnitsSpent: number;
};

/**
 * Fetch top-level comments, store chat + rows in DB, upload CSV for Pinecone.
 */
export async function fetchAndStoreYoutubeComments(params: {
  rawVideoInput: string;
  userId: string;
  onProgress?: (info: { pages: number; comments: number }) => Promise<void> | void;
}): Promise<FetchCommentsResult> {
  const { rawVideoInput, userId, onProgress } = params;

  const videoId = extractVideoId(String(rawVideoInput));
  if (!videoId) {
    throw new Error(
      "Could not extract a valid YouTube video ID from the provided value",
    );
  }

  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("YouTube API key is not configured");
  }

  // Reserve budget for up to MAX_PAGES list calls
  await assertQuotaAvailable(MAX_PAGES * COMMENT_THREADS_LIST_COST);

  const youtube = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
  });

  const commentThreads: NonNullable<
    Awaited<ReturnType<typeof youtube.commentThreads.list>>["data"]["items"]
  > = [];

  let pageToken: string | undefined;
  let pagesFetched = 0;
  let unitsSpent = 0;

  try {
    do {
      // Per-request check so we stop early if budget is nearly gone
      await assertQuotaAvailable(COMMENT_THREADS_LIST_COST);

      const response = await youtube.commentThreads.list({
        part: ["snippet"],
        videoId,
        maxResults: 100,
        pageToken,
        textFormat: "plainText",
      });

      pagesFetched += 1;
      unitsSpent += COMMENT_THREADS_LIST_COST;
      await recordQuotaUsage(COMMENT_THREADS_LIST_COST);

      if (response.data.items?.length) {
        commentThreads.push(...response.data.items);
      }

      pageToken = response.data.nextPageToken ?? undefined;

      await onProgress?.({
        pages: pagesFetched,
        comments: Math.min(commentThreads.length, MAX_COMMENTS),
      });

      if (commentThreads.length >= MAX_COMMENTS) break;
      if (pagesFetched >= MAX_PAGES) break;
    } while (pageToken);
  } catch (error) {
    if (error instanceof QuotaExceededError) throw error;

    const classified = classifyYoutubeError(error);
    const e = new Error(classified.message);
    (e as Error & { code?: string }).code = classified.code;
    throw e;
  }

  if (!commentThreads.length) {
    throw new Error("This video has no comments (or comments are disabled).");
  }

  type ParsedComment = {
    youtubeCommentId: string | null;
    authorDisplayName: string | null;
    text: string;
    likeCount: number;
    publishedAt: Date | null;
  };

  const parsed: ParsedComment[] = commentThreads
    .slice(0, MAX_COMMENTS)
    .map((thread) => {
      const snip = thread.snippet?.topLevelComment?.snippet;
      const text = snip?.textDisplay?.trim() ?? "";
      return {
        youtubeCommentId: thread.snippet?.topLevelComment?.id ?? null,
        authorDisplayName: snip?.authorDisplayName ?? null,
        text,
        likeCount: snip?.likeCount ?? 0,
        publishedAt: snip?.publishedAt ? new Date(snip.publishedAt) : null,
      };
    })
    .filter((c) => Boolean(c.text));

  if (!parsed.length) {
    throw new Error("No usable comment text found.");
  }

  const csvContent = await generateCSV(parsed.map((c) => c.text));
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const file = await uploadToSupabase(videoId, blob, userId);

  const chatId = crypto.randomUUID();

  await db.insert($chats).values({
    id: chatId,
    userId,
    fileId: file.id,
    fileName: file.path,
    videoId,
  });

  const commentRows = parsed.map((c) => ({
    id: crypto.randomUUID(),
    chatId,
    youtubeCommentId: c.youtubeCommentId,
    authorDisplayName: c.authorDisplayName,
    text: c.text,
    likeCount: c.likeCount,
    publishedAt: c.publishedAt,
  }));

  const CHUNK = 100;
  for (let i = 0; i < commentRows.length; i += CHUNK) {
    await db.insert($comments).values(commentRows.slice(i, i + CHUNK));
  }

  return {
    chatId,
    file_key: file.id,
    file_name: file.path,
    commentCount: commentRows.length,
    videoId,
    pagesFetched,
    quotaUnitsSpent: unitsSpent,
  };
}
