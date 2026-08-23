import { google } from "googleapis";
import { NextResponse } from "next/server";
import { generateCSV } from "@/lib/utils";
import { uploadToSupabase } from "@/lib/supabase-bucket";
import { db } from "@/lib/db";
import { $chats } from "@/lib/db/schema";

const MAX_COMMENTS = 500;

/** Extract a YouTube video ID from a raw ID or full URL. */
function extractVideoId(input: string): string | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();

  // Already a bare 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    // youtu.be/<id>
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1).split("/")[0] || null;
    }
    // youtube.com/watch?v=<id> or /embed/<id> or /shorts/<id>
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
        { error: "Could not extract a valid YouTube video ID from the provided value" },
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

    const comments: Awaited<
      ReturnType<typeof youtube.commentThreads.list>
    >["data"]["items"] = [];

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
        comments.push(...response.data.items);
      }

      pageToken = response.data.nextPageToken ?? undefined;

      // Hard cap to protect quota and downstream processing
      if (comments.length >= MAX_COMMENTS) {
        break;
      }
    } while (pageToken);

    if (!comments.length) {
      return NextResponse.json(
        { error: "This video has no comments (or comments are disabled)." },
        { status: 400 },
      );
    }

    // Keep only top-level comment text, drop empties, respect the cap
    const records = comments
      .slice(0, MAX_COMMENTS)
      .map((c) => c.snippet?.topLevelComment?.snippet?.textDisplay?.trim())
      .filter((text): text is string => Boolean(text));

    if (!records.length) {
      return NextResponse.json(
        { error: "No usable comment text found." },
        { status: 400 },
      );
    }

    const csvContent = await generateCSV(records);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const file = await uploadToSupabase(videoId, blob, userId);

    const chat = await db
      .insert($chats)
      .values({
        id: crypto.randomUUID(),
        userId,
        fileId: file.id,
        fileName: file.path,
      })
      .returning({
        id: $chats.id,
        fileId: $chats.fileId,
        fileName: $chats.fileName,
      });

    return NextResponse.json(
      {
        chatId: chat[0].id,
        file_key: chat[0].fileId,
        file_name: chat[0].fileName,
        commentCount: records.length,
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
