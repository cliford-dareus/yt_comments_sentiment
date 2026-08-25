import { google } from "googleapis";
import { db } from "@/lib/db";
import { $channelScans, $channelScanVideos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  assertQuotaAvailable,
  classifyYoutubeError,
  COMMENT_THREADS_LIST_COST,
  QuotaExceededError,
  recordQuotaUsage,
  VIDEOS_LIST_COST,
} from "@/lib/youtube-quota";
import { generateText, withRetry } from "@/lib/gemini";
import { computeHealthScore } from "@/lib/health-score";

export const CHANNEL_SCAN_MAX_VIDEOS = Number(
  process.env.YOUTUBE_CHANNEL_SCAN_MAX_VIDEOS ?? 5,
);
export const CHANNEL_SCAN_COMMENTS_PER_VIDEO = Number(
  process.env.YOUTUBE_CHANNEL_SCAN_COMMENTS_PER_VIDEO ?? 40,
);

const CHANNELS_LIST_COST = 1;
const PLAYLIST_ITEMS_LIST_COST = 1;

function youtubeClient() {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("YouTube API key is not configured");
  }
  return google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
  });
}

/** Parse channel URL, @handle, or UC… id. */
export function parseChannelInput(input: string): {
  kind: "id" | "handle" | "username" | "unknown";
  value: string;
} {
  const trimmed = input.trim();
  if (!trimmed) return { kind: "unknown", value: "" };

  if (/^UC[\w-]{20,}$/.test(trimmed)) {
    return { kind: "id", value: trimmed };
  }
  if (trimmed.startsWith("@")) {
    return { kind: "handle", value: trimmed.slice(1) };
  }

  try {
    const url = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );
    if (url.hostname.includes("youtube.com") || url.hostname === "youtu.be") {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "channel" && parts[1]) {
        return { kind: "id", value: parts[1] };
      }
      if (parts[0] === "@" || parts[0]?.startsWith("@")) {
        return {
          kind: "handle",
          value: parts[0].replace(/^@/, "") || parts[1] || "",
        };
      }
      if (parts[0]?.startsWith("@")) {
        return { kind: "handle", value: parts[0].slice(1) };
      }
      if (parts[0] === "c" && parts[1]) {
        return { kind: "username", value: parts[1] };
      }
      if (parts[0] === "user" && parts[1]) {
        return { kind: "username", value: parts[1] };
      }
      // /@handle
      if (parts[0]?.startsWith("@")) {
        return { kind: "handle", value: parts[0].slice(1) };
      }
      const at = parts.find((p) => p.startsWith("@"));
      if (at) return { kind: "handle", value: at.slice(1) };
    }
  } catch {
    // not a URL
  }

  if (/^[\w.-]{3,}$/.test(trimmed)) {
    return { kind: "handle", value: trimmed.replace(/^@/, "") };
  }

  return { kind: "unknown", value: trimmed };
}

async function resolveChannel(input: string) {
  const parsed = parseChannelInput(input);
  if (parsed.kind === "unknown" || !parsed.value) {
    throw new Error(
      "Could not parse channel. Use a channel URL, @handle, or UC… id.",
    );
  }

  await assertQuotaAvailable(CHANNELS_LIST_COST);
  const youtube = youtubeClient();

  try {
    let res;
    if (parsed.kind === "id") {
      res = await youtube.channels.list({
        part: ["snippet", "contentDetails", "statistics"],
        id: [parsed.value],
        maxResults: 1,
      });
    } else if (parsed.kind === "handle") {
      res = await youtube.channels.list({
        part: ["snippet", "contentDetails", "statistics"],
        forHandle: parsed.value,
        maxResults: 1,
      });
    } else {
      res = await youtube.channels.list({
        part: ["snippet", "contentDetails", "statistics"],
        forUsername: parsed.value,
        maxResults: 1,
      });
    }
    await recordQuotaUsage(CHANNELS_LIST_COST);

    const ch = res.data.items?.[0];
    if (!ch?.id) {
      throw new Error("Channel not found");
    }

    const uploads =
      ch.contentDetails?.relatedPlaylists?.uploads ?? null;
    if (!uploads) {
      throw new Error("Could not resolve uploads playlist for this channel");
    }

    return {
      channelId: ch.id,
      channelTitle: ch.snippet?.title ?? "Channel",
      uploadsPlaylistId: uploads,
      subscriberCount: ch.statistics?.subscriberCount
        ? Number(ch.statistics.subscriberCount)
        : null,
    };
  } catch (error) {
    if (error instanceof QuotaExceededError) throw error;
    if (error instanceof Error && error.message.includes("not found"))
      throw error;
    const c = classifyYoutubeError(error);
    throw new Error(c.message);
  }
}

async function listRecentUploads(playlistId: string, max: number) {
  await assertQuotaAvailable(PLAYLIST_ITEMS_LIST_COST);
  const youtube = youtubeClient();

  try {
    const res = await youtube.playlistItems.list({
      part: ["contentDetails", "snippet"],
      playlistId,
      maxResults: Math.min(50, max),
    });
    await recordQuotaUsage(PLAYLIST_ITEMS_LIST_COST);

    const items =
      res.data.items
        ?.map((it) => ({
          videoId: it.contentDetails?.videoId ?? "",
          title: it.snippet?.title ?? "Untitled",
          publishedAt: it.contentDetails?.videoPublishedAt
            ? new Date(it.contentDetails.videoPublishedAt)
            : it.snippet?.publishedAt
              ? new Date(it.snippet.publishedAt)
              : null,
        }))
        .filter((v) => Boolean(v.videoId)) ?? [];

    return items.slice(0, max);
  } catch (error) {
    if (error instanceof QuotaExceededError) throw error;
    const c = classifyYoutubeError(error);
    throw new Error(c.message);
  }
}

async function getVideoStats(videoIds: string[]) {
  if (!videoIds.length) return new Map<string, number | null>();
  await assertQuotaAvailable(VIDEOS_LIST_COST);
  const youtube = youtubeClient();

  try {
    const res = await youtube.videos.list({
      part: ["statistics"],
      id: videoIds,
      maxResults: videoIds.length,
    });
    await recordQuotaUsage(VIDEOS_LIST_COST);

    const map = new Map<string, number | null>();
    for (const item of res.data.items ?? []) {
      if (item.id) {
        map.set(
          item.id,
          item.statistics?.viewCount
            ? Number(item.statistics.viewCount)
            : null,
        );
      }
    }
    return map;
  } catch (error) {
    if (error instanceof QuotaExceededError) throw error;
    console.warn("getVideoStats failed", error);
    return new Map();
  }
}

async function sampleComments(videoId: string, max: number) {
  await assertQuotaAvailable(COMMENT_THREADS_LIST_COST);
  const youtube = youtubeClient();

  try {
    const res = await youtube.commentThreads.list({
      part: ["snippet"],
      videoId,
      maxResults: Math.min(100, max),
      order: "relevance",
      textFormat: "plainText",
    });
    await recordQuotaUsage(COMMENT_THREADS_LIST_COST);

    return (
      res.data.items
        ?.map((t) => {
          const snip = t.snippet?.topLevelComment?.snippet;
          return {
            text: (snip?.textDisplay ?? "").trim(),
            likes: snip?.likeCount ?? 0,
          };
        })
        .filter((c) => c.text.length > 0)
        .slice(0, max) ?? []
    );
  } catch (error) {
    if (error instanceof QuotaExceededError) throw error;
    console.warn("sampleComments failed", videoId, error);
    return [];
  }
}

type Label = "positive" | "negative" | "neutral";

async function labelTexts(
  texts: { text: string; likes: number }[],
) {
  const empty = {
    positive: 0,
    negative: 0,
    neutral: 0,
    positiveLikes: 0,
    negativeLikes: 0,
    neutralLikes: 0,
  };
  if (!texts.length) return empty;

  const payload = texts.map((t, i) => ({
    i,
    text: t.text.slice(0, 280),
  }));

  try {
    const raw = await withRetry(
      () =>
        generateText({
          prompt: `Classify YouTube comment sentiment. Return JSON array only: [{"i":0,"label":"positive"|"negative"|"neutral"}]
Comments:
${JSON.stringify(payload)}`,
          temperature: 0.1,
          json: true,
          maxOutputTokens: 2048,
        }),
      { label: "channelScanLabel", retries: 2 },
    );

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    const byIndex = new Map<number, Label>();
    if (Array.isArray(parsed)) {
      for (const row of parsed as Array<Record<string, unknown>>) {
        const i = Number(row.i);
        const label = String(row.label) as Label;
        if (
          Number.isFinite(i) &&
          (label === "positive" ||
            label === "negative" ||
            label === "neutral")
        ) {
          byIndex.set(i, label);
        }
      }
    }

    const out = { ...empty };
    texts.forEach((t, i) => {
      const label = byIndex.get(i) ?? "neutral";
      if (label === "positive") {
        out.positive++;
        out.positiveLikes += t.likes;
      } else if (label === "negative") {
        out.negative++;
        out.negativeLikes += t.likes;
      } else {
        out.neutral++;
        out.neutralLikes += t.likes;
      }
    });
    return out;
  } catch (err) {
    console.error("channel scan label failed", err);
    return {
      ...empty,
      neutral: texts.length,
      neutralLikes: texts.reduce((s, t) => s + t.likes, 0),
    };
  }
}

function pct(n: number, total: number) {
  return total ? Math.round((n / total) * 100) : 0;
}

async function updateScan(
  scanId: string,
  patch: Record<string, unknown>,
) {
  await db
    .update($channelScans)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq($channelScans.id, scanId));
}

export async function createChannelScan(params: {
  userId: string;
  channelInput: string;
  maxVideos?: number;
}) {
  const id = crypto.randomUUID();
  await db.insert($channelScans).values({
    id,
    userId: params.userId,
    channelId: "pending",
    channelInput: params.channelInput.trim(),
    status: "pending",
    progress: 0,
    stepLabel: "Queued",
  });
  return id;
}

/**
 * Process a channel scan: resolve channel → last N uploads → sample+label.
 * Typical quota: 1 (channels) + 1 (playlist) + 1 (videos) + N (comments).
 */
export async function processChannelScan(
  scanId: string,
  maxVideos = CHANNEL_SCAN_MAX_VIDEOS,
) {
  const rows = await db
    .select()
    .from($channelScans)
    .where(eq($channelScans.id, scanId))
    .limit(1);
  const scan = rows[0];
  if (!scan) throw new Error("Scan not found");
  if (scan.status === "completed") return { alreadyDone: true as const };

  const n = Math.min(8, Math.max(2, maxVideos));
  const commentsPer = Math.min(
    80,
    Math.max(15, CHANNEL_SCAN_COMMENTS_PER_VIDEO),
  );

  // Budget: channels + playlist + videos list + N comment pages
  await assertQuotaAvailable(3 + n);

  try {
    await updateScan(scanId, {
      status: "fetching",
      progress: 5,
      stepLabel: "Resolving channel…",
      error: null,
    });

    const channel = await resolveChannel(scan.channelInput);

    await updateScan(scanId, {
      channelId: channel.channelId,
      channelTitle: channel.channelTitle,
      progress: 12,
      stepLabel: `Loading last ${n} uploads…`,
    });

    const uploads = await listRecentUploads(channel.uploadsPlaylistId, n);
    if (!uploads.length) {
      throw new Error("No public uploads found on this channel");
    }

    const viewMap = await getVideoStats(uploads.map((u) => u.videoId));

    // Clear prior video rows if re-running
    await db
      .delete($channelScanVideos)
      .where(eq($channelScanVideos.scanId, scanId));

    await updateScan(scanId, {
      status: "labeling",
      progress: 20,
      videoCount: uploads.length,
      stepLabel: `Analyzing ${uploads.length} videos…`,
    });

    const scored: Array<{
      videoId: string;
      title: string;
      healthScore: number | null;
      positivePct: number;
      negativePct: number;
    }> = [];

    for (let i = 0; i < uploads.length; i++) {
      const u = uploads[i];
      const texts = await sampleComments(u.videoId, commentsPer);
      const counts = await labelTexts(texts);
      const total = counts.positive + counts.negative + counts.neutral;
      const health = computeHealthScore({
        positive: counts.positive,
        negative: counts.negative,
        neutral: counts.neutral,
        unlabeled: 0,
        positiveLikes: counts.positiveLikes,
        negativeLikes: counts.negativeLikes,
        neutralLikes: counts.neutralLikes,
      });

      const positivePct = pct(counts.positive, total);
      const negativePct = pct(counts.negative, total);
      const neutralPct = pct(counts.neutral, total);

      await db.insert($channelScanVideos).values({
        id: crypto.randomUUID(),
        scanId,
        videoId: u.videoId,
        title: u.title,
        publishedAt: u.publishedAt,
        viewCount: viewMap.get(u.videoId) ?? null,
        sampleSize: total,
        positivePct,
        negativePct,
        neutralPct,
        healthScore: health?.score ?? null,
        // chronological for trends: oldest first in chart = reverse of uploads order
        sortOrder: uploads.length - 1 - i,
      });

      scored.push({
        videoId: u.videoId,
        title: u.title,
        healthScore: health?.score ?? null,
        positivePct,
        negativePct,
      });

      const progress = 20 + Math.round(((i + 1) / uploads.length) * 65);
      await updateScan(scanId, {
        progress,
        stepLabel: `Labeled ${i + 1}/${uploads.length}: ${u.title.slice(0, 40)}…`,
      });
    }

    // Narrative
    let narrative = "";
    try {
      // Chart order: oldest → newest
      const series = [...scored].reverse();
      narrative = await withRetry(
        () =>
          generateText({
            temperature: 0.3,
            maxOutputTokens: 500,
            prompt: `You advise YouTube creators on comment-section trends across recent videos.
Data is from small samples of top comments — rough, not census-level.

Channel: ${channel.channelTitle}
Videos (oldest → newest):
${JSON.stringify(series)}

Write:
1) One-line trend read (improving / stable / cooling)
2) Best and weakest video by health (title + why in ≤1 clause each)
3) One actionable suggestion for the next upload
Keep under 150 words.`,
          }),
        { label: "channelScanNarrative", retries: 1 },
      );
    } catch {
      const scores = scored
        .map((s) => s.healthScore)
        .filter((s): s is number => s != null);
      const avg = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;
      narrative = avg != null
        ? `Average health across ${scored.length} videos: ${avg}/100. Review individual videos for spikes in negativity.`
        : "Scan finished with limited label data.";
    }

    await updateScan(scanId, {
      status: "completed",
      progress: 100,
      stepLabel: "Done",
      narrative,
      error: null,
      videoCount: uploads.length,
    });

    return { alreadyDone: false as const };
  } catch (err) {
    const message =
      err instanceof QuotaExceededError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Channel scan failed";
    console.error("processChannelScan failed:", err);
    await updateScan(scanId, {
      status: "failed",
      stepLabel: "Failed",
      error: message,
    });
    throw err;
  }
}

export async function getChannelScan(scanId: string, userId: string) {
  const scans = await db
    .select()
    .from($channelScans)
    .where(eq($channelScans.id, scanId))
    .limit(1);

  const scan = scans[0];
  if (!scan || scan.userId !== userId) return null;

  const videos = await db
    .select()
    .from($channelScanVideos)
    .where(eq($channelScanVideos.scanId, scanId));

  videos.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return { scan, videos };
}

export async function listChannelScans(userId: string, limit = 10) {
  return db
    .select()
    .from($channelScans)
    .where(eq($channelScans.userId, userId))
    .orderBy($channelScans.createdAt)
    .limit(limit);
}
