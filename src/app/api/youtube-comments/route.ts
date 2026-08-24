import { google } from "googleapis";
import { NextResponse } from "next/server";
import { generateCSV } from "@/lib/utils";
import { uploadToSupabase } from "@/lib/supabase-bucket";
import { db } from "@/lib/db";
import { $chats, $comments } from "@/lib/db/schema";

const MAX_COMMENTS = 500;

/** Extract a YouTube video ID from a raw ID or full URL. */
function extractVideoId(input: string): string | null {
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawVideoId = body?.videoId?.videoId ?? body?.videoId;
    const userId = body?.userId;

    if (!rawVideoId || !userId) {
      return NextResponse.json(
        { error: "Video ID (or URL) and userId are required" },
        { status: 400 },
      );
    }

    const videoId = extractVideoId(String(rawVideoId));
    if (!videoId) {
      return NextResponse.json(
        {
          error:
            "Could not extract a valid YouTube video ID from the provided value",
        },
        { status: 400 },
      );
    }

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key is not configured" },
        { status: 500 },
      );
    }

    const youtube = google.youtube({
      version: "v3",
      auth: process.env.YOUTUBE_API_KEY,
    });

    const commentThreads: NonNullable<
      Awaited<ReturnType<typeof youtube.commentThreads.list>>["data"]["items"]
    > = [];

    let pageToken: string | undefined = undefined;

    do {
      const response = await youtube.commentThreads.list({
        part: ["snippet"],
        videoId,
        maxResults: 100,
        pageToken,
        textFormat: "plainText",
      });

      if (response.data.items?.length) {
        commentThreads.push(...response.data.items);
      }

      pageToken = response.data.nextPageToken ?? undefined;

      if (commentThreads.length >= MAX_COMMENTS) {
        break;
      }
    } while (pageToken);

    if (!commentThreads.length) {
      return NextResponse.json(
        { error: "This video has no comments (or comments are disabled)." },
        { status: 400 },
      );
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
      return NextResponse.json(
        { error: "No usable comment text found." },
        { status: 400 },
      );
    }

    // Keep CSV upload for Pinecone / legacy path
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

    // Persist comments in Postgres
    const commentRows = parsed.map((c) => ({
      id: crypto.randomUUID(),
      chatId,
      youtubeCommentId: c.youtubeCommentId,
      authorDisplayName: c.authorDisplayName,
      text: c.text,
      likeCount: c.likeCount,
      publishedAt: c.publishedAt,
    }));

    // Insert in chunks to avoid huge payloads
    const CHUNK = 100;
    for (let i = 0; i < commentRows.length; i += CHUNK) {
      await db.insert($comments).values(commentRows.slice(i, i + CHUNK));
    }

    return NextResponse.json(
      {
        chatId,
        file_key: file.id,
        file_name: file.path,
        commentCount: commentRows.length,
        videoId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Internal server error while fetching YouTube comments" },
      { status: 500 },
    );
  }
}
