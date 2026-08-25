import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { $channelScans } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { processChannelScan } from "@/lib/channel-scan";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  req: Request,
  { params }: { params: { scanId: string } },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select()
      .from($channelScans)
      .where(
        and(
          eq($channelScans.id, params.scanId),
          eq($channelScans.userId, user.id),
        ),
      )
      .limit(1);

    if (!rows.length) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    let maxVideos = 5;
    try {
      const body = await req.json();
      if (body?.maxVideos) maxVideos = Number(body.maxVideos) || 5;
    } catch {
      // no body
    }

    // Reset if failed so process can run again
    if (rows[0].status === "failed") {
      await db
        .update($channelScans)
        .set({
          status: "pending",
          progress: 0,
          stepLabel: "Retrying…",
          error: null,
          updatedAt: new Date(),
        })
        .where(eq($channelScans.id, params.scanId));
    }

    await processChannelScan(params.scanId, maxVideos);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("channel-scan/run error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to run scan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
