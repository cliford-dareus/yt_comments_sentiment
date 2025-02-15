import { google } from "googleapis";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateCSV } from "@/lib/utils";
import { uploadToSupabase } from "@/lib/supabase-bucket";
import { getUser, lucia } from "@/lib/lucia";
import { db } from "@/lib/db";
import { $chats } from "@/lib/db/schema";

export async function POST(req: Request) {
  const { videoId, userId } = await req.json();

  if (!videoId.videoId || !userId) {
    return NextResponse.json(
      { error: "Video ID is required" },
      { status: 400 },
    );
  }

  const youtube = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
  });

  try {
    const comments = [];
    let pageToken = "";

    do {
      const response = await youtube.commentThreads.list({
        part: ["snippet"],
        videoId: videoId.videoId,
        maxResults: 100,
        pageToken: pageToken,
      });

      comments.push(...response.data.items!);
      pageToken = response?.data.nextPageToken!;
    } while (pageToken);

    if (comments.length <= 0) {
      return NextResponse.json(
        { error: "Video does have any comment." },
        { status: 400 },
      );
    }

    // generate csv from content
    const records = comments.map((comment) => {
      return comment.snippet?.topLevelComment?.snippet?.textDisplay;
    }) as string[];

    const csvContent = await generateCSV(records);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    // Save the file to a bucket
    const file = await uploadToSupabase(
      comments[0].snippet?.videoId!,
      blob,
      userId,
    );

    // Save a record in db
    const chat = await db
      .insert($chats)
      .values({
        id: await crypto.randomUUID(),
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
        csv: blob,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching comments:", error);

    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "RECEIVED" });
}
