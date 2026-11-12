import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAnalysisJob } from "@/lib/analysis-job";
import { enqueueAnalysisJob } from "@/lib/job-queue";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const videoInput =
      typeof body?.videoId === "string"
        ? body.videoId
        : body?.videoId?.videoId;

    if (!videoInput || typeof videoInput !== "string") {
      return NextResponse.json(
        { error: "videoId (URL or ID) is required" },
        { status: 400 },
      );
    }

    const jobId = await createAnalysisJob({
      userId: user.id,
      videoInput: videoInput.trim(),
    });

    // Hand off to a separate serverless invocation — do not void-process here.
    await enqueueAnalysisJob(jobId, { req });

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (error) {
    console.error("jobs/start error:", error);
    return NextResponse.json(
      { error: "Failed to start analysis job" },
      { status: 500 },
    );
  }
}
