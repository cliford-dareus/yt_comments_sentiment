import { db } from "@/lib/db";
import { $jobs } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { fetchAndStoreYoutubeComments } from "@/lib/fetch-youtube-comments";
import {
    labelCommentsForChat,
    buildOverallSummary,
} from "@/lib/analyze-comments";
import loadSupabaseToPinecone from "@/lib/pinecone";
import { QuotaExceededError } from "@/lib/youtube-quota";

type JobStatus =
    | "pending"
    | "fetching"
    | "labeling"
    | "indexing"
    | "completed"
    | "failed";

async function updateJob(
    jobId: string,
    patch: {
        status?: JobStatus;
        progress?: number;
        stepLabel?: string;
        error?: string | null;
        chatId?: string;
        videoId?: string;
        commentCount?: number;
    },
) {
    await db
        .update($jobs)
        .set({
            ...patch,
            updatedAt: new Date(),
        })
        .where(eq($jobs.id, jobId));
}

/**
 * Atomically claim a pending job. Returns false if another worker already claimed it.
 */
async function claimJob(jobId: string) {
    const claimed = await db
        .update($jobs)
        .set({
            status: "fetching",
            progress: 5,
            stepLabel: "Fetching comments from YouTube…",
            error: null,
            updatedAt: new Date(),
        })
        .where(and(eq($jobs.id, jobId), eq($jobs.status, "pending")))
        .returning({ id: $jobs.id });

    return claimed.length > 0;
}

/**
 * Reset a failed job to pending so it can be claimed again.
 * Returns false if the job is not in failed state (or missing).
 */
export async function resetFailedJob(jobId: string, userId?: string) {
    const conditions = userId
        ? and(
            eq($jobs.id, jobId),
            eq($jobs.status, "failed"),
            eq($jobs.userId, userId),
        )
        : and(eq($jobs.id, jobId), eq($jobs.status, "failed"));

    const reset = await db
        .update($jobs)
        .set({
            status: "pending",
            progress: 0,
            stepLabel: "Retrying…",
            error: null,
            updatedAt: new Date(),
        })
        .where(conditions)
        .returning({ id: $jobs.id });

    return reset.length > 0;
}

/**
 * Retry a failed job: reset → process.
 */
export async function retryAnalysisJob(jobId: string, userId: string) {
    const rows = await db
        .select()
        .from($jobs)
        .where(and(eq($jobs.id, jobId), eq($jobs.userId, userId)))
        .limit(1);

    const job = rows[0];
    if (!job) {
        throw new Error("Job not found");
    }

    if (job.status === "completed") {
        return { chatId: job.chatId, alreadyDone: true as const };
    }

    if (
        job.status === "fetching" ||
        job.status === "labeling" ||
        job.status === "indexing"
    ) {
        return { chatId: job.chatId, alreadyRunning: true as const };
    }

    if (job.status === "failed") {
        const ok = await resetFailedJob(jobId, userId);
        if (!ok) {
            throw new Error("Could not reset failed job");
        }
    }

    return processAnalysisJob(jobId);
}

/**
 * Run a full analysis pipeline for a job row.
 */
export async function processAnalysisJob(jobId: string) {
    const rows = await db.select().from($jobs).where(eq($jobs.id, jobId)).limit(1);
    const job = rows[0];

    if (!job) {
        throw new Error("Job not found");
    }

    if (job.status === "completed") {
        return { chatId: job.chatId, alreadyDone: true as const };
    }

    if (job.status === "failed") {
        return {
            chatId: job.chatId,
            alreadyDone: false as const,
            failed: true as const,
        };
    }

    if (
        job.status === "fetching" ||
        job.status === "labeling" ||
        job.status === "indexing"
    ) {
        return { chatId: job.chatId, alreadyRunning: true as const };
    }

    const gotLock = await claimJob(jobId);
    if (!gotLock) {
        return { chatId: job.chatId, alreadyRunning: true as const };
    }

    const fresh = await db.select().from($jobs).where(eq($jobs.id, jobId)).limit(1);
    const current = fresh[0]!;

    try {
        const fetchResult = await fetchAndStoreYoutubeComments({
            rawVideoInput: current.videoInput,
            userId: current.userId,
            onProgress: async ({ pages, comments }) => {
                const pct = Math.min(40, 5 + pages * 6);
                await updateJob(jobId, {
                    progress: pct,
                    stepLabel: `Fetched ${comments} comments (page ${pages})…`,
                });
            },
        });

        await updateJob(jobId, {
            status: "labeling",
            progress: 45,
            stepLabel: `Labeling ${fetchResult.commentCount} comments…`,
            chatId: fetchResult.chatId,
            videoId: fetchResult.videoId,
            commentCount: fetchResult.commentCount,
        });

        await labelCommentsForChat(fetchResult.chatId);

        await updateJob(jobId, {
            progress: 70,
            stepLabel: "Building insights summary…",
        });

        await buildOverallSummary(fetchResult.chatId);

        await updateJob(jobId, {
            status: "indexing",
            progress: 80,
            stepLabel: "Building search index…",
        });

        try {
            if (fetchResult.file_name) {
                await loadSupabaseToPinecone(fetchResult.file_name);
            }
        } catch (indexErr) {
            console.error("Pinecone indexing failed (non-fatal):", indexErr);
        }

        await updateJob(jobId, {
            status: "completed",
            progress: 100,
            stepLabel: "Done",
            chatId: fetchResult.chatId,
            videoId: fetchResult.videoId,
            commentCount: fetchResult.commentCount,
            error: null,
        });

        return { chatId: fetchResult.chatId, alreadyDone: false as const };
    } catch (err) {
        const message =
            err instanceof QuotaExceededError
                ? err.message
                : err instanceof Error
                    ? err.message
                    : "Analysis failed";

        console.error("processAnalysisJob failed:", err);

        await updateJob(jobId, {
            status: "failed",
            stepLabel: "Failed",
            error: message,
        });

        throw err;
    }
}

export async function createAnalysisJob(params: {
    userId: string;
    videoInput: string;
}) {
    const id = crypto.randomUUID();

    await db.insert($jobs).values({
        id,
        userId: params.userId,
        videoInput: params.videoInput,
        status: "pending",
        progress: 0,
        stepLabel: "Queued",
    });

    return id;
}

export async function listFailedJobs(userId: string, limit = 10) {
    return db
        .select({
            id: $jobs.id,
            videoInput: $jobs.videoInput,
            videoId: $jobs.videoId,
            error: $jobs.error,
            stepLabel: $jobs.stepLabel,
            createdAt: $jobs.createdAt,
            updatedAt: $jobs.updatedAt,
        })
        .from($jobs)
        .where(and(eq($jobs.userId, userId), eq($jobs.status, "failed")))
        .orderBy(desc($jobs.updatedAt))
        .limit(limit);
}
