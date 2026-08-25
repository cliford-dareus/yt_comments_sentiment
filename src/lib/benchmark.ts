import { google } from "googleapis";
import {
  assertQuotaAvailable,
  classifyYoutubeError,
  COMMENT_THREADS_LIST_COST,
  QuotaExceededError,
  recordQuotaUsage,
  SEARCH_LIST_COST,
  VIDEOS_LIST_COST,
} from "@/lib/youtube-quota";
import { generateText, withRetry } from "@/lib/gemini";
import { computeHealthScore, type HealthScoreResult } from "@/lib/health-score";
import { getCommentStats } from "@/lib/analyze-comments";

/** Max peer videos to sample (keeps search + comments cheap). */
export const BENCHMARK_MAX_PEERS = Number(
  process.env.YOUTUBE_BENCHMARK_MAX_PEERS ?? 3,
);
/** One page of comments per peer — 1 quota unit each. */
export const BENCHMARK_COMMENTS_PER_PEER = Number(
  process.env.YOUTUBE_BENCHMARK_COMMENTS_PER_PEER ?? 50,
);

export type BenchmarkPeer = {
  videoId: string;
  title: string;
  channelTitle: string;
  viewCount: number | null;
  commentCount: number | null;
  sampleSize: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  health: HealthScoreResult | null;
};

export type BenchmarkResult = {
  sourceVideoId: string;
  sourceTitle: string | null;
  sourceHealth: HealthScoreResult | null;
  sourcePositivePct: number;
  sourceNegativePct: number;
  peers: BenchmarkPeer[];
  peerAvgHealth: number | null;
  deltaVsPeers: number | null;
  rankLabel: string;
  narrative: string;
  quotaUnitsSpent: number;
  mode: "auto" | "manual";
  disclaimer: string;
};

function youtubeClient() {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("YouTube API key is not configured");
  }
  return google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
  });
}

async function getVideoMeta(videoId: string) {
  await assertQuotaAvailable(VIDEOS_LIST_COST);
  const youtube = youtubeClient();

  try {
    const res = await youtube.videos.list({
      part: ["snippet", "statistics"],
      id: [videoId],
      maxResults: 1,
    });
    await recordQuotaUsage(VIDEOS_LIST_COST);

    const item = res.data.items?.[0];
    if (!item) return null;

    return {
      videoId,
      title: item.snippet?.title ?? "Untitled",
      channelTitle: item.snippet?.channelTitle ?? "Unknown",
      channelId: item.snippet?.channelId ?? null,
      tags: item.snippet?.tags ?? [],
      categoryId: item.snippet?.categoryId ?? null,
      viewCount: item.statistics?.viewCount
        ? Number(item.statistics.viewCount)
        : null,
      commentCount: item.statistics?.commentCount
        ? Number(item.statistics.commentCount)
        : null,
    };
  } catch (error) {
    if (error instanceof QuotaExceededError) throw error;
    const c = classifyYoutubeError(error);
    throw new Error(c.message);
  }
}

/**
 * Find similar videos via search.list (100 units).
 * Prefer tag/title keywords; exclude the source video.
 */
async function findSimilarVideoIds(params: {
  sourceVideoId: string;
  title: string;
  tags: string[];
  channelId: string | null;
  max: number;
}): Promise<{ ids: string[]; units: number }> {
  await assertQuotaAvailable(SEARCH_LIST_COST);
  const youtube = youtubeClient();

  const tagBit = params.tags.slice(0, 3).join(" ");
  // Keep query short — search is expensive
  const q = [params.title.split(/[\s\-|:]+/).slice(0, 6).join(" "), tagBit]
    .filter(Boolean)
    .join(" ")
    .slice(0, 80);

  try {
    const res = await youtube.search.list({
      part: ["snippet"],
      type: ["video"],
      q,
      maxResults: Math.min(10, params.max + 4),
      order: "relevance",
      // Avoid flooding with same-channel clones when possible
      ...(params.channelId ? {} : {}),
    });
    await recordQuotaUsage(SEARCH_LIST_COST);

    const ids =
      res.data.items
        ?.map((i) => i.id?.videoId)
        .filter((id): id is string => Boolean(id) && id !== params.sourceVideoId)
        .slice(0, params.max) ?? [];

    return { ids, units: SEARCH_LIST_COST };
  } catch (error) {
    if (error instanceof QuotaExceededError) throw error;
    const c = classifyYoutubeError(error);
    throw new Error(c.message);
  }
}

async function sampleTopComments(
  videoId: string,
  max: number,
): Promise<{ texts: { text: string; likes: number }[]; units: number }> {
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

    const texts =
      res.data.items
        ?.map((t) => {
          const snip = t.snippet?.topLevelComment?.snippet;
          return {
            text: (snip?.textDisplay ?? "").trim(),
            likes: snip?.likeCount ?? 0,
          };
        })
        .filter((c) => c.text.length > 0)
        .slice(0, max) ?? [];

    return { texts, units: COMMENT_THREADS_LIST_COST };
  } catch (error) {
    // Comments disabled → empty sample, don't fail whole benchmark
    if (error instanceof QuotaExceededError) throw error;
    console.warn("sampleTopComments failed for", videoId, error);
    return { texts: [], units: COMMENT_THREADS_LIST_COST };
  }
}

type Label = "positive" | "negative" | "neutral";

async function labelCommentTexts(
  texts: { text: string; likes: number }[],
): Promise<{
  positive: number;
  negative: number;
  neutral: number;
  positiveLikes: number;
  negativeLikes: number;
  neutralLikes: number;
}> {
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
    text: t.text.slice(0, 300),
  }));

  const prompt = `Classify YouTube comment sentiment.
Return JSON array only: [{"i":0,"label":"positive"|"negative"|"neutral"}]
One object per input index.

Comments:
${JSON.stringify(payload)}`;

  let rows: Array<{ i: number; label: Label }> = [];
  try {
    const raw = await withRetry(
      () =>
        generateText({
          prompt,
          temperature: 0.1,
          json: true,
          maxOutputTokens: 2048,
        }),
      { label: "benchmarkLabel", retries: 2 },
    );

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      rows = parsed
        .map((r: Record<string, unknown>) => ({
          i: Number(r.i),
          label: String(r.label) as Label,
        }))
        .filter(
          (r) =>
            Number.isFinite(r.i) &&
            (r.label === "positive" ||
              r.label === "negative" ||
              r.label === "neutral"),
        );
    }
  } catch (err) {
    console.error("benchmark label failed:", err);
    // Fall back to all neutral so comparison still renders
    return {
      ...empty,
      neutral: texts.length,
      neutralLikes: texts.reduce((s, t) => s + t.likes, 0),
    };
  }

  const byIndex = new Map(rows.map((r) => [r.i, r.label]));
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
}

function pct(n: number, total: number) {
  return total ? Math.round((n / total) * 100) : 0;
}

function rankLabel(delta: number | null): string {
  if (delta == null) return "Insufficient data";
  if (delta >= 12) return "Stronger than peers";
  if (delta >= 4) return "Slightly ahead";
  if (delta > -4) return "In line with peers";
  if (delta > -12) return "Slightly behind";
  return "Weaker than peers";
}

/**
 * Run a rough niche benchmark for a chat's video.
 * Quota budget (typical):
 *  - videos.list source: 1
 *  - search.list (auto only): 100
 *  - commentThreads × peers: ≤3
 *  Total auto ≈ 104 units; manual IDs ≈ 1 + peers.
 */
export async function runSimilarVideoBenchmark(params: {
  chatId: string;
  sourceVideoId: string;
  /** Optional explicit competitor video IDs — skips search.list (saves 100 units). */
  manualVideoIds?: string[];
}): Promise<BenchmarkResult> {
  const maxPeers = Math.min(5, Math.max(1, BENCHMARK_MAX_PEERS));
  const commentsPerPeer = Math.min(
    100,
    Math.max(10, BENCHMARK_COMMENTS_PER_PEER),
  );

  let units = 0;
  const mode: "auto" | "manual" =
    params.manualVideoIds && params.manualVideoIds.length > 0
      ? "manual"
      : "auto";

  // Soft budget check up-front
  const estimated =
    VIDEOS_LIST_COST +
    (mode === "auto" ? SEARCH_LIST_COST : 0) +
    maxPeers * COMMENT_THREADS_LIST_COST;
  await assertQuotaAvailable(estimated);

  const sourceMeta = await getVideoMeta(params.sourceVideoId);
  units += VIDEOS_LIST_COST;

  if (!sourceMeta) {
    throw new Error("Source video not found on YouTube");
  }

  const sourceStats = await getCommentStats(params.chatId);

  let peerIds: string[] = [];
  if (mode === "manual") {
    peerIds = (params.manualVideoIds ?? [])
      .map((id) => id.trim())
      .filter((id) => id && id !== params.sourceVideoId)
      .slice(0, maxPeers);
  } else {
    const found = await findSimilarVideoIds({
      sourceVideoId: params.sourceVideoId,
      title: sourceMeta.title,
      tags: sourceMeta.tags,
      channelId: sourceMeta.channelId,
      max: maxPeers,
    });
    peerIds = found.ids;
    units += found.units;
  }

  if (!peerIds.length) {
    return {
      sourceVideoId: params.sourceVideoId,
      sourceTitle: sourceMeta.title,
      sourceHealth: sourceStats.health,
      sourcePositivePct: sourceStats.positivePct,
      sourceNegativePct: sourceStats.negativePct,
      peers: [],
      peerAvgHealth: null,
      deltaVsPeers: null,
      rankLabel: "No peers found",
      narrative:
        "Could not find comparable videos (or search returned nothing). Try pasting competitor video IDs manually.",
      quotaUnitsSpent: units,
      mode,
      disclaimer:
        "Rough directional comparison only — not a scientific ranking. Limited by API sample size and quota.",
    };
  }

  const peers: BenchmarkPeer[] = [];

  for (const peerId of peerIds) {
    const meta = await getVideoMeta(peerId);
    units += VIDEOS_LIST_COST;
    if (!meta) continue;

    const { texts, units: cUnits } = await sampleTopComments(
      peerId,
      commentsPerPeer,
    );
    units += cUnits;

    const counts = await labelCommentTexts(texts);
    const total =
      counts.positive + counts.negative + counts.neutral;
    const health = computeHealthScore({
      positive: counts.positive,
      negative: counts.negative,
      neutral: counts.neutral,
      unlabeled: 0,
      positiveLikes: counts.positiveLikes,
      negativeLikes: counts.negativeLikes,
      neutralLikes: counts.neutralLikes,
    });

    peers.push({
      videoId: peerId,
      title: meta.title,
      channelTitle: meta.channelTitle,
      viewCount: meta.viewCount,
      commentCount: meta.commentCount,
      sampleSize: total,
      positivePct: pct(counts.positive, total),
      negativePct: pct(counts.negative, total),
      neutralPct: pct(counts.neutral, total),
      health,
    });
  }

  const peerScores = peers
    .map((p) => p.health?.score)
    .filter((s): s is number => typeof s === "number");
  const peerAvgHealth = peerScores.length
    ? Math.round(
        peerScores.reduce((a, b) => a + b, 0) / peerScores.length,
      )
    : null;

  const sourceScore = sourceStats.health?.score ?? null;
  const deltaVsPeers =
    sourceScore != null && peerAvgHealth != null
      ? sourceScore - peerAvgHealth
      : null;

  const rank = rankLabel(deltaVsPeers);

  let narrative = "";
  try {
    narrative = await withRetry(
      () =>
        generateText({
          temperature: 0.3,
          maxOutputTokens: 400,
          prompt: `You compare YouTube comment-section health for creators.
Be careful: this is a ROUGH sample (top comments only), not a full census.

Source video: "${sourceMeta.title}"
Source health: ${sourceScore ?? "n/a"}/100
Source positive/negative %: ${sourceStats.positivePct}% / ${sourceStats.negativePct}%

Peer averages health: ${peerAvgHealth ?? "n/a"}
Delta (source − peers): ${deltaVsPeers ?? "n/a"}
Rank label: ${rank}

Peers:
${JSON.stringify(
  peers.map((p) => ({
    title: p.title,
    channel: p.channelTitle,
    health: p.health?.score,
    pos: p.positivePct,
    neg: p.negativePct,
    sample: p.sampleSize,
  })),
)}

Write 3 short bullets:
1) How this video's comment climate compares
2) One strength vs peers
3) One risk or gap vs peers
No hype. Mention sample limits in one clause.`,
        }),
      { label: "benchmarkNarrative", retries: 1 },
    );
  } catch {
    narrative =
      deltaVsPeers != null
        ? `Health score is ${deltaVsPeers >= 0 ? "+" : ""}${deltaVsPeers} vs peer average (${peerAvgHealth}). ${rank}. Based on small top-comment samples only.`
        : "Not enough peer data to compare.";
  }

  return {
    sourceVideoId: params.sourceVideoId,
    sourceTitle: sourceMeta.title,
    sourceHealth: sourceStats.health,
    sourcePositivePct: sourceStats.positivePct,
    sourceNegativePct: sourceStats.negativePct,
    peers,
    peerAvgHealth,
    deltaVsPeers,
    rankLabel: rank,
    narrative,
    quotaUnitsSpent: units,
    mode,
    disclaimer:
      "Rough directional comparison only. Uses a small sample of top comments per video and relevance search — not a full audience census. Respect YouTube API quotas.",
  };
}
