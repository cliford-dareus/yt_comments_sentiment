import { db } from "@/lib/db";
import { $comments, $sentiment } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { computeHealthScore } from "@/lib/health-score";
import { generateText, withRetry } from "@/lib/gemini";

/** Keep batches modest so JSON responses stay reliable under token limits. */
const BATCH_SIZE = 20;

type Label = "positive" | "negative" | "neutral";

type LabeledItem = {
  id: string;
  label: Label;
  score: number;
};

function parseJsonFromModel(text: string): unknown {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Sometimes the model wraps the array in an object
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("Could not parse JSON from model output");
  }
}

function normalizeLabel(raw: unknown): Label | null {
  const s = String(raw ?? "")
    .toLowerCase()
    .trim();
  if (s === "positive" || s === "negative" || s === "neutral") return s;
  return null;
}

async function labelBatch(
  items: { id: string; text: string }[],
): Promise<LabeledItem[]> {
  const payload = items.map((c) => ({
    id: c.id,
    text: c.text.slice(0, 400),
  }));

  const prompt = `Classify YouTube comment sentiment.

Return a JSON array only (no markdown, no prose). Each element:
{"id":"<exact id>","label":"positive"|"negative"|"neutral","score":0-100}

Rules:
- positive: praise, excitement, support, thanks
- negative: criticism, frustration, dislike, complaints
- neutral: questions, off-topic, mixed, pure info
- score = confidence 0-100
- One object per input, same ids

Comments:
${JSON.stringify(payload)}`;

  const raw = await withRetry(
    () =>
      generateText({
        prompt,
        temperature: 0.1,
        json: true,
        maxOutputTokens: 4096,
      }),
    { label: "labelBatch", retries: 3, baseDelayMs: 1000 },
  );

  let parsed: unknown;
  try {
    parsed = parseJsonFromModel(raw);
  } catch {
    console.error("Failed to parse sentiment batch JSON:", raw.slice(0, 500));
    // Soft-fail this batch as neutral so the job can continue
    return items.map((c) => ({
      id: c.id,
      label: "neutral" as Label,
      score: 0,
    }));
  }

  // Accept either a bare array or { results: [...] } / { items: [...] }
  let rows: unknown[] = [];
  if (Array.isArray(parsed)) {
    rows = parsed;
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.results)) rows = obj.results;
    else if (Array.isArray(obj.items)) rows = obj.items;
    else if (Array.isArray(obj.labels)) rows = obj.labels;
  }

  const byId = new Map<string, LabeledItem>();
  for (const row of rows as Array<Record<string, unknown>>) {
    const id = String(row.id ?? "");
    const label = normalizeLabel(row.label);
    const score = Number(row.score ?? 50);
    if (!id || !label) continue;
    byId.set(id, {
      id,
      label,
      score: Math.max(0, Math.min(100, Math.round(score))),
    });
  }

  return items.map(
    (c) => byId.get(c.id) ?? { id: c.id, label: "neutral" as Label, score: 0 },
  );
}

export async function labelCommentsForChat(
  chatId: string,
  onProgress?: (info: {
    labeled: number;
    total: number;
    batchIndex: number;
    batchCount: number;
  }) => Promise<void> | void,
) {
  const rows = await db
    .select({
      id: $comments.id,
      text: $comments.text,
      sentimentLabel: $comments.sentimentLabel,
    })
    .from($comments)
    .where(eq($comments.chatId, chatId));

  const unlabeled = rows.filter((r) => !r.sentimentLabel);
  if (!unlabeled.length) {
    return { labeled: 0, total: rows.length };
  }

  const batchCount = Math.ceil(unlabeled.length / BATCH_SIZE);
  let labeledCount = 0;

  for (let i = 0; i < unlabeled.length; i += BATCH_SIZE) {
    const batchIndex = Math.floor(i / BATCH_SIZE);
    const batch = unlabeled.slice(i, i + BATCH_SIZE);

    const results = await labelBatch(
      batch.map((b) => ({ id: b.id, text: b.text })),
    );

    // Sequential updates are slower but safer under connection limits
    for (const r of results) {
      await db
        .update($comments)
        .set({
          sentimentLabel: r.label,
          sentimentScore: r.score,
        })
        .where(eq($comments.id, r.id));
    }

    labeledCount += results.length;

    await onProgress?.({
      labeled: labeledCount,
      total: unlabeled.length,
      batchIndex: batchIndex + 1,
      batchCount,
    });
  }

  return { labeled: labeledCount, total: rows.length };
}

export async function buildOverallSummary(chatId: string) {
  const rows = await db
    .select({
      text: $comments.text,
      label: $comments.sentimentLabel,
      likes: $comments.likeCount,
    })
    .from($comments)
    .where(eq($comments.chatId, chatId));

  if (!rows.length) {
    return { error: "No comments to summarize" };
  }

  const counts = { positive: 0, negative: 0, neutral: 0 };
  for (const r of rows) {
    if (r.label === "positive") counts.positive++;
    else if (r.label === "negative") counts.negative++;
    else counts.neutral++;
  }

  const total = rows.length;
  const pct = (n: number) => Math.round((n / total) * 100);

  const sample = (label: Label, n: number) =>
    rows
      .filter((r) => r.label === label)
      .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
      .slice(0, n)
      .map((r) => r.text.slice(0, 200));

  const prompt = `You help YouTube creators understand their audience.

Stats for this video's top-level comments (n=${total}):
- Positive: ${counts.positive} (${pct(counts.positive)}%)
- Negative: ${counts.negative} (${pct(counts.negative)}%)
- Neutral: ${counts.neutral} (${pct(counts.neutral)}%)

Sample positive:
${JSON.stringify(sample("positive", 5))}

Sample negative:
${JSON.stringify(sample("negative", 5))}

Sample neutral:
${JSON.stringify(sample("neutral", 5))}

Write a concise creator-facing brief:
1. One-line overall read
2. Main themes (bullet list, max 5)
3. What to double-down on
4. What to address or fix
5. One suggested pinned-comment or community-post angle

Keep it under 250 words. No invented quotes.`;

  const analysis = await withRetry(
    () =>
      generateText({
        prompt,
        temperature: 0.3,
        maxOutputTokens: 1024,
      }),
    { label: "buildOverallSummary", retries: 2 },
  );

  const existing = await db
    .select({ id: $sentiment.id })
    .from($sentiment)
    .where(eq($sentiment.chatId, chatId));

  if (existing.length) {
    await db
      .update($sentiment)
      .set({ content: analysis })
      .where(
        inArray(
          $sentiment.id,
          existing.map((e) => e.id),
        ),
      );
  } else {
    await db.insert($sentiment).values({
      id: crypto.randomUUID(),
      chatId,
      content: analysis,
    });
  }

  return {
    analysis,
    stats: {
      total,
      positive: counts.positive,
      negative: counts.negative,
      neutral: counts.neutral,
      positivePct: pct(counts.positive),
      negativePct: pct(counts.negative),
      neutralPct: pct(counts.neutral),
    },
  };
}

export async function getCommentStats(chatId: string) {
  const rows = await db
    .select({
      label: $comments.sentimentLabel,
      likes: $comments.likeCount,
    })
    .from($comments)
    .where(eq($comments.chatId, chatId));

  const counts = {
    positive: 0,
    negative: 0,
    neutral: 0,
    unlabeled: 0,
    positiveLikes: 0,
    negativeLikes: 0,
    neutralLikes: 0,
  };

  for (const r of rows) {
    const likes = r.likes ?? 0;
    if (r.label === "positive") {
      counts.positive++;
      counts.positiveLikes += likes;
    } else if (r.label === "negative") {
      counts.negative++;
      counts.negativeLikes += likes;
    } else if (r.label === "neutral") {
      counts.neutral++;
      counts.neutralLikes += likes;
    } else {
      counts.unlabeled++;
    }
  }

  const total = rows.length;
  const labeled = total - counts.unlabeled;
  const pct = (n: number) => (labeled ? Math.round((n / labeled) * 100) : 0);

  const health = computeHealthScore({
    positive: counts.positive,
    negative: counts.negative,
    neutral: counts.neutral,
    unlabeled: counts.unlabeled,
    positiveLikes: counts.positiveLikes,
    negativeLikes: counts.negativeLikes,
    neutralLikes: counts.neutralLikes,
  });

  return {
    total,
    positive: counts.positive,
    negative: counts.negative,
    neutral: counts.neutral,
    unlabeled: counts.unlabeled,
    positivePct: pct(counts.positive),
    negativePct: pct(counts.negative),
    neutralPct: pct(counts.neutral),
    positiveLikes: counts.positiveLikes,
    negativeLikes: counts.negativeLikes,
    neutralLikes: counts.neutralLikes,
    health,
  };
}
