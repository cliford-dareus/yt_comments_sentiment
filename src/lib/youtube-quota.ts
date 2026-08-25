import { db } from "@/lib/db";
import { $youtubeQuota } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** Default daily budget under the usual 10k unit ceiling. */
const DEFAULT_DAILY_LIMIT = Number(
  process.env.YOUTUBE_DAILY_QUOTA_LIMIT ?? 8000,
);

/** commentThreads.list costs 1 unit per request. */
export const COMMENT_THREADS_LIST_COST = 1;

export function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export async function getQuotaUsage(day = utcDayKey()) {
  const rows = await db
    .select()
    .from($youtubeQuota)
    .where(eq($youtubeQuota.day, day))
    .limit(1);

  return rows[0]?.unitsUsed ?? 0;
}

export async function assertQuotaAvailable(unitsNeeded: number) {
  const day = utcDayKey();
  const used = await getQuotaUsage(day);
  const limit = DEFAULT_DAILY_LIMIT;

  if (used + unitsNeeded > limit) {
    throw new QuotaExceededError(
      `YouTube API daily budget exceeded (${used}/${limit} units used). Try again tomorrow or raise YOUTUBE_DAILY_QUOTA_LIMIT.`,
      { used, limit },
    );
  }

  return { day, used, limit, remaining: limit - used };
}

export async function recordQuotaUsage(units: number) {
  if (units <= 0) return;

  const day = utcDayKey();
  const existing = await db
    .select()
    .from($youtubeQuota)
    .where(eq($youtubeQuota.day, day))
    .limit(1);

  if (existing.length) {
    await db
      .update($youtubeQuota)
      .set({
        unitsUsed: (existing[0].unitsUsed ?? 0) + units,
        updatedAt: new Date(),
      })
      .where(eq($youtubeQuota.day, day));
  } else {
    await db.insert($youtubeQuota).values({
      day,
      unitsUsed: units,
      updatedAt: new Date(),
    });
  }
}

export class QuotaExceededError extends Error {
  used?: number;
  limit?: number;

  constructor(
    message: string,
    meta?: { used?: number; limit?: number },
  ) {
    super(message);
    this.name = "QuotaExceededError";
    this.used = meta?.used;
    this.limit = meta?.limit;
  }
}

/** Map googleapis / GAxios errors to a user-facing message. */
export function classifyYoutubeError(error: unknown): {
  message: string;
  code: "quota" | "rate_limit" | "forbidden" | "not_found" | "unknown";
} {
  const err = error as {
    code?: number;
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
    response?: {
      status?: number;
      data?: {
        error?: {
          errors?: Array<{ reason?: string; message?: string }>;
          message?: string;
        };
      };
    };
  };

  const reasons =
    err?.errors?.map((e) => e.reason) ??
    err?.response?.data?.error?.errors?.map((e) => e.reason) ??
    [];

  const status = err?.code ?? err?.response?.status;
  const msg =
    err?.message ??
    err?.response?.data?.error?.message ??
    "YouTube API request failed";

  if (
    reasons.includes("quotaExceeded") ||
    reasons.includes("dailyLimitExceeded") ||
    /quota/i.test(msg)
  ) {
    return {
      code: "quota",
      message:
        "YouTube API quota exhausted for today. New analyses will work after the quota resets (midnight Pacific).",
    };
  }

  if (
    reasons.includes("rateLimitExceeded") ||
    reasons.includes("userRateLimitExceeded") ||
    status === 429
  ) {
    return {
      code: "rate_limit",
      message: "YouTube is rate-limiting requests. Wait a minute and try again.",
    };
  }

  if (reasons.includes("commentsDisabled") || /disabled/i.test(msg)) {
    return {
      code: "forbidden",
      message: "Comments are disabled on this video.",
    };
  }

  if (status === 404 || reasons.includes("videoNotFound")) {
    return {
      code: "not_found",
      message: "Video not found. Check the URL or ID.",
    };
  }

  return { code: "unknown", message: msg };
}
