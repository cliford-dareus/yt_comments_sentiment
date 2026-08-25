import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { retryAnalysisJob } from "@/lib/analysis-job";

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
    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    // Fire processing after a quick ack is nicer for UI polling, but we need
    // the reset to complete first. Reset+process runs here; client polls GET.
    // To keep the HTTP response responsive for long runs, process in background
    // after confirming reset via retryAnalysisJob's first steps…
    //
    // Practical approach: reset synchronously, then void process, return 202.
    const { resetFailedJob } = await import("@/lib/analysis-job");
    const { db } = await import("@/lib/db");
    const { $jobs } = await import("@/lib/db/schema");
    const { and, eq } = await import("drizzle-orm");

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

    if (
      job.status === "fetching" ||
      job.status === "labeling" ||
      job.status === "indexing"
    ) {
      return NextResponse.json(
        { error: "Job is already running", jobId },
        { status: 409 },
      );
    }

    if (job.status === "failed") {
      const ok = await resetFailedJob(jobId, user.id);
      if (!ok) {
        return NextResponse.json(
          { error: "Could not reset failed job" },
          { status: 409 },
        );
      }
    }

    // pending (or just reset) — kick off processing
    void retryAnalysisJob(jobId, user.id).catch((err) => {
      console.error("retry background error:", err);
    });

    // Also hit process path if still pending after reset (retryAnalysisJob handles it)
    const { processAnalysisJob } = await import("@/lib/analysis-job");
    void processAnalysisJob(jobId).catch((err) => {
      console.error("retry process error:", err);
    });

    return NextResponse.json({ ok: true, jobId, status: "pending" }, { status: 202 });
  } catch (error) {
    console.error("jobs/retry error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to retry job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
