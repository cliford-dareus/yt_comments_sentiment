/**
 * Durable job dispatch for serverless.
 *
 * Pattern:
 *  1. Create a DB row with status=pending
 *  2. Fire an HTTP request to /api/jobs/worker (new serverless invocation)
 *  3. Cron also hits the worker every minute as a safety net
 *
 * Never rely on `void processX()` in the same request — that dies when
 * the HTTP response is sent on Vercel/serverless.
 */

const STUCK_AFTER_MS = Number(process.env.JOB_STUCK_AFTER_MS ?? 4 * 60 * 1000);

export function getAppBaseUrl(req?: Request): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_APP_URL)
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (req) {
    try {
      return new URL(req.url).origin;
    } catch {
      // fall through
    }
  }
  return "http://localhost:3000";
}

export function getWorkerSecret(): string {
  return (
    process.env.JOB_WORKER_SECRET ||
    process.env.CRON_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    ""
  );
}

export function isWorkerAuthorized(req: Request): boolean {
  const secret = getWorkerSecret();
  if (!secret) {
    // Dev fallback: allow when no secret is configured (local only)
    if (process.env.NODE_ENV !== "production") return true;
    return false;
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;

  // Vercel Cron sends this header when Authorization is configured in vercel.json
  const cron = req.headers.get("x-vercel-cron-authorization") ?? "";
  if (cron === `Bearer ${secret}`) return true;

  // Some Vercel setups only set CRON_SECRET via Authorization on the cron request
  const vercelCron = req.headers.get("x-vercel-cron");
  if (vercelCron === "1" && auth === `Bearer ${secret}`) return true;

  return false;
}

export function stuckCutoff(now = Date.now()): Date {
  return new Date(now - STUCK_AFTER_MS);
}

/**
 * Kick the worker in a separate invocation.
 * Uses waitUntil when available so the dispatch survives the parent response.
 */
export async function dispatchWorker(
  payload: {
    jobId?: string;
    scanId?: string;
    limit?: number;
  },
  opts?: { req?: Request },
): Promise<void> {
  const base = getAppBaseUrl(opts?.req);
  const secret = getWorkerSecret();
  const url = `${base}/api/jobs/worker`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret) headers.Authorization = `Bearer ${secret}`;

  const run = async () => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        // Don't let a hung worker block the dispatcher forever
        signal: AbortSignal.timeout(10_000),
      });
      // 202/200 are fine; worker may still be running after we disconnect
      if (!res.ok && res.status !== 202) {
        const text = await res.text().catch(() => "");
        console.error(
          `[job-queue] worker dispatch failed ${res.status}: ${text.slice(0, 200)}`,
        );
      }
    } catch (err) {
      // Timeout is expected — worker continues on its own invocation
      const msg = err instanceof Error ? err.message : String(err);
      if (!/aborted|timeout/i.test(msg)) {
        console.error("[job-queue] worker dispatch error:", err);
      }
    }
  };

  // Prefer waitUntil so the fetch outlives the parent serverless response
  try {
    const { waitUntil } = await import("@vercel/functions");
    waitUntil(run());
    return;
  } catch {
    // Not on Vercel or package missing — fire and forget
  }

  void run();
}

export async function enqueueAnalysisJob(
  jobId: string,
  opts?: { req?: Request },
) {
  await dispatchWorker({ jobId, limit: 1 }, opts);
}

export async function enqueueChannelScan(
  scanId: string,
  opts?: { req?: Request },
) {
  await dispatchWorker({ scanId, limit: 1 }, opts);
}
