import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import {
  CHANNEL_SCAN_MAX_VIDEOS,
  createChannelScan,
  processChannelScan,
} from "@/lib/channel-scan";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const channelInput =
      typeof body?.channelInput === "string" ? body.channelInput.trim() : "";
    const maxVideos = Math.min(
      8,
      Math.max(2, Number(body?.maxVideos ?? CHANNEL_SCAN_MAX_VIDEOS) || 5),
    );

    if (!channelInput) {
      return NextResponse.json(
        { error: "channelInput is required (URL, @handle, or UC id)" },
        { status: 400 },
      );
    }

    const scanId = await createChannelScan({
      userId: user.id,
      channelInput,
      maxVideos,
    });

    void processChannelScan(scanId, maxVideos).catch((err) => {
      console.error("channel scan background error:", err);
    });

    return NextResponse.json({ scanId }, { status: 202 });
  } catch (error) {
    console.error("channel-scan/start error:", error);
    return NextResponse.json(
      { error: "Failed to start channel scan" },
      { status: 500 },
    );
  }
}
