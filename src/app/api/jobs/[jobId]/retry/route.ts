import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { $jobs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { resetJobForRetry } from "@/lib/analysis-job";
import { enqueueAnalysisJob } from "@/lib/job-queue";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(
  req: Request,
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
      .select()
      .from($jobs)
      .where(and(eq($jobs.id, jobId), eq($jobs.userId, user.id)))
      .limit(1);

    if (!rows.length) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = rows[0];

    if (job.status === "completed") {
      return NextResponse.json({
        ok: true,
        jobId,
        chatId: job.chatId,
        alreadyDone: true,
      });
    }

    const reset = await resetJobForRetry(jobId, user.id);
    if (!reset) {
      return NextResponse.json(
        { error: "Could not reset job" },
        { status: 409 },
      );
    }

    await enqueueAnalysisJob(jobId, { req });

    return NextResponse.json(
      { ok: true, jobId, status: "pending", resumedChatId: reset.chatId },
      { status: 202 },
    );
  } catch (error) {
    console.error("jobs/retry error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to retry job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
