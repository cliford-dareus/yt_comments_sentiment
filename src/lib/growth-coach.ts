import { db } from "@/lib/db";
import { $comments, $sentiment, $themeClusters } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { generateText, withRetry } from "@/lib/gemini";
import { getCommentStats } from "@/lib/analyze-comments";

export type GrowthAdvice = {
  headline: string;
  /** What to fix or change in the next video */
  videoImprovements: Array<{
    title: string;
    why: string;
    how: string;
  }>;
  /** Ordered next actions for the creator this week */
  nextSteps: Array<{
    action: string;
    priority: "high" | "medium" | "low";
  }>;
  /** Strengths to lean into */
  doubleDown: string[];
  /** Longer-horizon channel growth ideas grounded in this comment data */
  channelGrowth: string[];
};

function parseJson(text: string): unknown {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("Could not parse growth advice JSON");
  }
}

function normalizeAdvice(raw: unknown): GrowthAdvice | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const headline = String(o.headline ?? "").trim();
  if (!headline) return null;

  const videoImprovements = Array.isArray(o.videoImprovements)
    ? (o.videoImprovements as Array<Record<string, unknown>>)
        .map((row) => ({
          title: String(row.title ?? "").trim(),
          why: String(row.why ?? "").trim(),
          how: String(row.how ?? "").trim(),
        }))
        .filter((r) => r.title && r.how)
        .slice(0, 5)
    : [];

  const nextSteps = Array.isArray(o.nextSteps)
    ? (o.nextSteps as Array<Record<string, unknown>>)
        .map((row) => {
          const p = String(row.priority ?? "medium").toLowerCase();
          const priority =
            p === "high" || p === "low" ? p : ("medium" as const);
          return {
            action: String(row.action ?? "").trim(),
            priority: priority as "high" | "medium" | "low",
          };
        })
        .filter((r) => r.action)
        .slice(0, 6)
    : [];

  const doubleDown = Array.isArray(o.doubleDown)
    ? o.doubleDown.map((x) => String(x).trim()).filter(Boolean).slice(0, 5)
    : [];

  const channelGrowth = Array.isArray(o.channelGrowth)
    ? o.channelGrowth.map((x) => String(x).trim()).filter(Boolean).slice(0, 5)
    : [];

  return {
    headline,
    videoImprovements,
    nextSteps,
    doubleDown,
    channelGrowth,
  };
}

/**
 * Build actionable growth advice from this video's comment analysis.
 */
export async function generateGrowthAdvice(chatId: string): Promise<
  | { advice: GrowthAdvice }
  | { error: string }
> {
  const [stats, sentimentRows, themes, sampleRows] = await Promise.all([
    getCommentStats(chatId),
    db
      .select({ content: $sentiment.content })
      .from($sentiment)
      .where(eq($sentiment.chatId, chatId))
      .limit(1),
    db
      .select({
        themeKey: $themeClusters.themeKey,
        label: $themeClusters.label,
        polarity: $themeClusters.polarity,
        commentCount: $themeClusters.commentCount,
        likeWeight: $themeClusters.likeWeight,
        summary: $themeClusters.summary,
      })
      .from($themeClusters)
      .where(eq($themeClusters.chatId, chatId))
      .orderBy(desc($themeClusters.likeWeight))
      .limit(12),
    db
      .select({
        text: $comments.text,
        label: $comments.sentimentLabel,
        likes: $comments.likeCount,
        themeKey: $comments.themeKey,
      })
      .from($comments)
      .where(eq($comments.chatId, chatId))
      .orderBy(desc($comments.likeCount))
      .limit(24),
  ]);

  if (!stats.total) {
    return { error: "No comments analyzed yet for this project." };
  }

  const overview = sentimentRows[0]?.content?.slice(0, 1800) ?? "";
  const negativeSamples = sampleRows
    .filter((r) => r.label === "negative")
    .slice(0, 6)
    .map((r) => ({ text: r.text.slice(0, 220), likes: r.likes, theme: r.themeKey }));
  const positiveSamples = sampleRows
    .filter((r) => r.label === "positive")
    .slice(0, 5)
    .map((r) => ({ text: r.text.slice(0, 180), likes: r.likes }));

  const prompt = `You are a practical YouTube growth coach for independent creators.
Use ONLY the data below. Do not invent metrics, subscriber counts, or niche claims not supported by the comments.

Comment stats:
${JSON.stringify({
  total: stats.total,
  positivePct: stats.positivePct,
  negativePct: stats.negativePct,
  neutralPct: stats.neutralPct,
  healthScore: stats.health?.score ?? null,
  healthGrade: stats.health?.grade ?? null,
  healthSummary: stats.health?.summary ?? null,
})}

Themes (from comments):
${JSON.stringify(themes)}

Top negative / constructive comments:
${JSON.stringify(negativeSamples)}

Top praise:
${JSON.stringify(positiveSamples)}

Creator brief (if any):
${overview || "(none)"}

Return ONLY valid JSON (no markdown) with this shape:
{
  "headline": "One sentence diagnosis of this video's audience response",
  "videoImprovements": [
    { "title": "Short fix name", "why": "Why viewers care (from comments)", "how": "Concrete how-to for the next upload (1–3 steps)" }
  ],
  "nextSteps": [
    { "action": "Specific action the creator can do this week", "priority": "high"|"medium"|"low" }
  ],
  "doubleDown": ["Strength to lean into on the next videos"],
  "channelGrowth": ["Channel-level growth idea grounded in this feedback"]
}

Rules:
- 2–4 videoImprovements, 3–5 nextSteps, 2–4 doubleDown, 2–4 channelGrowth
- Prefer production/craft fixes when themes mention audio, pacing, editing, thumbnails, etc.
- nextSteps should be sequenced: respond to comments, then content changes, then growth experiments
- Be direct and specific; no generic "post more" or "engage with your audience" without a how
- If criticism is thin, focus on amplifying what praise already validates`;

  try {
    const raw = await withRetry(
      () =>
        generateText({
          prompt,
          temperature: 0.4,
          json: true,
          maxOutputTokens: 2048,
        }),
      { label: "growthAdvice", retries: 2 },
    );

    const parsed = parseJson(raw);
    const advice = normalizeAdvice(parsed);
    if (!advice) {
      return { error: "Could not parse growth advice from the model." };
    }
    return { advice };
  } catch (err) {
    console.error("generateGrowthAdvice failed:", err);
    return { error: "Failed to generate growth advice. Try again." };
  }
}
