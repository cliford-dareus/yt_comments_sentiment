import { NextResponse } from "next/server";
import { fetchAndStoreYoutubeComments } from "@/lib/fetch-youtube-comments";
import { QuotaExceededError } from "@/lib/youtube-quota";

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

    const result = await fetchAndStoreYoutubeComments({
      rawVideoInput: String(rawVideoId),
      userId,
    });

    return NextResponse.json(
      {
        chatId: result.chatId,
        file_key: result.file_key,
        file_name: result.file_name,
        commentCount: result.commentCount,
        videoId: result.videoId,
        quotaUnitsSpent: result.quotaUnitsSpent,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching comments:", error);

    if (error instanceof QuotaExceededError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Internal server error while fetching YouTube comments";

    const status =
      message.includes("not found") ||
      message.includes("disabled") ||
      message.includes("No usable") ||
      message.includes("no comments")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
