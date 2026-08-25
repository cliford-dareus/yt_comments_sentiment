import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getChannelScan } from "@/lib/channel-scan";

export async function GET(
  _req: Request,
  { params }: { params: { scanId: string } },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getChannelScan(params.scanId, user.id);
    if (!data) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    return NextResponse.json({
      scan: {
        id: data.scan.id,
        channelId: data.scan.channelId,
        channelTitle: data.scan.channelTitle,
        channelInput: data.scan.channelInput,
        status: data.scan.status,
        progress: data.scan.progress,
        stepLabel: data.scan.stepLabel,
        error: data.scan.error,
        videoCount: data.scan.videoCount,
        narrative: data.scan.narrative,
        createdAt: data.scan.createdAt,
        updatedAt: data.scan.updatedAt,
      },
      videos: data.videos.map((v) => ({
        id: v.id,
        videoId: v.videoId,
        title: v.title,
        publishedAt: v.publishedAt,
        viewCount: v.viewCount,
        sampleSize: v.sampleSize,
        positivePct: v.positivePct,
        negativePct: v.negativePct,
        neutralPct: v.neutralPct,
        healthScore: v.healthScore,
        sortOrder: v.sortOrder,
      })),
    });
  } catch (error) {
    console.error("channel-scan GET error:", error);
    return NextResponse.json({ error: "Failed to load scan" }, { status: 500 });
  }
}
