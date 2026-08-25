import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { $jobs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { processAnalysisJob } from "@/lib/analysis-job";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  _req: Request,
  { params }: { params: { jobId: string } },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobId = params.jobId;
    const rows = await db
      .select()
      .from($jobs)
      .where(and(eq($jobs.id, jobId), eq($jobs.userId, user.id)))
      .limit(1);

    if (!rows.length) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // processAnalysisJob is idempotent for completed / in-flight jobs
    const result = await processAnalysisJob(jobId);

    return NextResponse.json({
      ok: true,
      chatId: result.chatId,
      alreadyDone: "alreadyDone" in result ? result.alreadyDone : false,
    });
  } catch (error) {
    console.error("jobs/run error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to run job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
