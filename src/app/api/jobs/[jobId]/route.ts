import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { $jobs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: { jobId: string } },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobId = params.jobId;
    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    const rows = await db
      .select({
        id: $jobs.id,
        status: $jobs.status,
        progress: $jobs.progress,
        stepLabel: $jobs.stepLabel,
        error: $jobs.error,
        chatId: $jobs.chatId,
        videoId: $jobs.videoId,
        commentCount: $jobs.commentCount,
        createdAt: $jobs.createdAt,
        updatedAt: $jobs.updatedAt,
      })
      .from($jobs)
      .where(and(eq($jobs.id, jobId), eq($jobs.userId, user.id)))
      .limit(1);

    if (!rows.length) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job: rows[0] });
  } catch (error) {
    console.error("jobs/[jobId] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load job" },
      { status: 500 },
    );
  }
}
