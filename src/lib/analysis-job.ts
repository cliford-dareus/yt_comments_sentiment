import { db } from "@/lib/db";
import { $jobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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
 * Run a full analysis pipeline for a job row.
 * Safe to call from a route handler; updates DB progress as it goes.
 */
export async function processAnalysisJob(jobId: string) {
  const rows = await db.select().from($jobs).where(eq($jobs.id, jobId)).limit(1);
  const job = rows[0];

  if (!job) {
    throw new Error("Job not found");
  }

  // Don't re-run terminal or in-flight jobs from a second worker
  if (job.status === "completed") {
    return { chatId: job.chatId, alreadyDone: true };
  }
  if (
    job.status === "fetching" ||
    job.status === "labeling" ||
    job.status === "indexing"
  ) {
    // Allow resume only if stuck? For v1 skip duplicate runs.
    return { chatId: job.chatId, alreadyRunning: true };
  }

  try {
    await updateJob(jobId, {
      status: "fetching",
      progress: 5,
      stepLabel: "Fetching comments from YouTube…",
      error: null,
    });

    const fetchResult = await fetchAndStoreYoutubeComments({
      rawVideoInput: job.videoInput,
      userId: job.userId,
      onProgress: async ({ pages, comments }) => {
        // Map fetch progress roughly into 5–40%
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
      // Non-fatal: chat + insights still usable without Pinecone
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

    return { chatId: fetchResult.chatId, alreadyDone: false };
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
