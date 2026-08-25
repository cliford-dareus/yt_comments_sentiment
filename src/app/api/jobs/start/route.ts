import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAnalysisJob, processAnalysisJob } from "@/lib/analysis-job";

export const runtime = "nodejs";
export const maxDuration = 120;

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

        // Start work without blocking the HTTP response so the client can poll.
        // On long-lived Node this continues; maxDuration covers typical serverless.
        void processAnalysisJob(jobId).catch((err) => {
            console.error("Background job error:", err);
        });

        return NextResponse.json({ jobId }, { status: 202 });
    } catch (error) {
        console.error("jobs/start error:", error);
        return NextResponse.json(
            { error: "Failed to start analysis job" },
            { status: 500 },
        );
    }
}
