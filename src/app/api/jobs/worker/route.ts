import { NextResponse } from "next/server";
import {
  listPendingAnalysisJobs,
  processAnalysisJob,
  reclaimStuckAnalysisJobs,
} from "@/lib/analysis-job";
import { processChannelScan } from "@/lib/channel-scan";
import { db } from "@/lib/db";
import { $channelScans } from "@/lib/db/schema";
import { isWorkerAuthorized, stuckCutoff } from "@/lib/job-queue";
import { and, asc, eq, inArray, lt } from "drizzle-orm";

export const runtime = "nodejs";
/** Allow long labeling runs on Pro / configured plans. */
export const maxDuration = 300;

async function reclaimStuckChannelScans(limit = 5) {
  const cutoff = stuckCutoff();
  const stuckStatuses = ["fetching", "labeling", "indexing"] as const;

  const stuck = await db
    .select({ id: $channelScans.id })
    .from($channelScans)
    .where(
      and(
        inArray($channelScans.status, [...stuckStatuses]),
        lt($channelScans.updatedAt, cutoff),
      ),
    )
    .orderBy(asc($channelScans.updatedAt))
    .limit(limit);

  const reclaimed: string[] = [];
  for (const row of stuck) {
    const updated = await db
      .update($channelScans)
      .set({
        status: "pending",
        stepLabel: "Requeued after stall…",
        error: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq($channelScans.id, row.id),
          inArray($channelScans.status, [...stuckStatuses]),
          lt($channelScans.updatedAt, cutoff),
        ),
      )
      .returning({ id: $channelScans.id });
    if (updated[0]) reclaimed.push(updated[0].id);
  }
  return reclaimed;
}

async function listPendingChannelScans(limit = 2) {
  return db
    .select({ id: $channelScans.id })
    .from($channelScans)
    .where(eq($channelScans.status, "pending"))
    .orderBy(asc($channelScans.createdAt))
    .limit(limit);
}

/**
 * Durable worker.
 *
 * Auth: Authorization: Bearer $JOB_WORKER_SECRET (or CRON_SECRET / NEXTAUTH_SECRET)
 *
 * Body (all optional):
 *   { jobId?, scanId?, limit? }
 *
 * - If jobId/scanId provided → process that item
 * - Else reclaim stuck work, then drain pending queue (up to limit)
 *
 * Also accepts GET for Vercel Cron (same reclaim + drain).
 */
async function handle(req: Request) {
  if (!isWorkerAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let jobId: string | undefined;
  let scanId: string | undefined;
  let limit = 3;

  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (typeof body?.jobId === "string") jobId = body.jobId;
      if (typeof body?.scanId === "string") scanId = body.scanId;
      if (body?.limit != null) limit = Math.min(10, Math.max(1, Number(body.limit) || 3));
    } catch {
      // empty body is fine (cron)
    }
  }

  const results: Array<Record<string, unknown>> = [];

  // Targeted job
  if (jobId) {
    try {
      const result = await processAnalysisJob(jobId);
      results.push({ type: "analysis", jobId, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "job failed";
      results.push({ type: "analysis", jobId, error: message });
    }
  }

  // Targeted channel scan
  if (scanId) {
    try {
      const result = await processChannelScan(scanId);
      results.push({ type: "channel_scan", scanId, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "scan failed";
      results.push({ type: "channel_scan", scanId, error: message });
    }
  }

  // Drain queue when no specific id (cron / catch-up)
  if (!jobId && !scanId) {
    const reclaimedJobs = await reclaimStuckAnalysisJobs(limit);
    const reclaimedScans = await reclaimStuckChannelScans(limit);

    if (reclaimedJobs.length || reclaimedScans.length) {
      results.push({
        type: "reclaim",
        jobs: reclaimedJobs,
        scans: reclaimedScans,
      });
    }

    const pendingJobs = await listPendingAnalysisJobs(limit);
    for (const row of pendingJobs) {
      try {
        const result = await processAnalysisJob(row.id);
        results.push({ type: "analysis", jobId: row.id, ...result });
      } catch (err) {
        const message = err instanceof Error ? err.message : "job failed";
        results.push({ type: "analysis", jobId: row.id, error: message });
      }
    }

    const pendingScans = await listPendingChannelScans(Math.min(2, limit));
    for (const row of pendingScans) {
      try {
        const result = await processChannelScan(row.id);
        results.push({ type: "channel_scan", scanId: row.id, ...result });
      } catch (err) {
        const message = err instanceof Error ? err.message : "scan failed";
        results.push({ type: "channel_scan", scanId: row.id, error: message });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
  });
}

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (error) {
    console.error("jobs/worker error:", error);
    return NextResponse.json(
      { error: "Worker failed" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    return await handle(req);
  } catch (error) {
    console.error("jobs/worker cron error:", error);
    return NextResponse.json(
      { error: "Worker failed" },
      { status: 500 },
    );
  }
}
