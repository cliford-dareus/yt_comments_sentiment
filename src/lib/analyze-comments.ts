import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/db";
import { $comments, $sentiment } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

const BATCH_SIZE = 40;

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
  return JSON.parse(cleaned);
}

/**
 * Label a batch of comments with Gemini. Returns id -> label/score.
 */
async function labelBatch(
  items: { id: string; text: string }[],
): Promise<LabeledItem[]> {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { temperature: 0.1 },
  });

  const payload = items.map((c, i) => ({
    i,
    id: c.id,
    text: c.text.slice(0, 500),
  }));

  const prompt = `You classify YouTube comment sentiment.

For each item return ONLY valid JSON (no markdown) as an array:
[{ "id": "<id>", "label": "positive"|"negative"|"neutral", "score": <0-100> }]

Rules:
- positive: praise, excitement, support, thanks
- negative: criticism, frustration, dislike, complaints
- neutral: questions, off-topic, mixed without clear lean, pure info
- score is your confidence 0-100
- Use the given id exactly
- One object per input item

Comments:
${JSON.stringify(payload)}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  let parsed: unknown;
  try {
    parsed = parseJsonFromModel(raw);
  } catch {
    console.error("Failed to parse sentiment batch JSON:", raw.slice(0, 400));
    return items.map((c) => ({ id: c.id, label: "neutral" as Label, score: 0 }));
  }

  if (!Array.isArray(parsed)) {
    return items.map((c) => ({ id: c.id, label: "neutral" as Label, score: 0 }));
  }

  const byId = new Map<string, LabeledItem>();
  for (const row of parsed as Array<Record<string, unknown>>) {
    const id = String(row.id ?? "");
    const label = row.label as Label;
    const score = Number(row.score ?? 50);
    if (!id) continue;
    if (label !== "positive" && label !== "negative" && label !== "neutral") continue;
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

/**
 * Load unlabeled comments for a chat, label in batches, write back to DB.
 */
export async function labelCommentsForChat(chatId: string) {
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

  let labeledCount = 0;

  for (let i = 0; i < unlabeled.length; i += BATCH_SIZE) {
    const batch = unlabeled.slice(i, i + BATCH_SIZE);
    const results = await labelBatch(
      batch.map((b) => ({ id: b.id, text: b.text })),
    );

    // Update each row (drizzle lacks great bulk update-by-case here)
    await Promise.all(
      results.map((r) =>
        db
          .update($comments)
          .set({
            sentimentLabel: r.label,
            sentimentScore: r.score,
          })
          .where(eq($comments.id, r.id)),
      ),
    );

    labeledCount += results.length;
  }

  return { labeled: labeledCount, total: rows.length };
}

/**
 * Build a short narrative summary from labeled comments and store on $sentiment.
 */
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

  // Sample a few of each for the model
  const sample = (label: Label, n: number) =>
    rows
      .filter((r) => r.label === label)
      .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
      .slice(0, n)
      .map((r) => r.text.slice(0, 200));

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { temperature: 0.3 },
  });

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

  const result = await model.generateContent(prompt);
  const analysis = result.response.text();

  // Replace any prior summary for this chat
  const existing = await db
    .select({ id: $sentiment.id })
    .from($sentiment)
    .where(eq($sentiment.chatId, chatId));

  if (existing.length) {
    await db
      .update($sentiment)
      .set({ content: analysis })
      .where(inArray(
        $sentiment.id,
        existing.map((e) => e.id),
      ));
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
    })
    .from($comments)
    .where(eq($comments.chatId, chatId));

  const counts = { positive: 0, negative: 0, neutral: 0, unlabeled: 0 };
  for (const r of rows) {
    if (r.label === "positive") counts.positive++;
    else if (r.label === "negative") counts.negative++;
    else if (r.label === "neutral") counts.neutral++;
    else counts.unlabeled++;
  }

  const total = rows.length;
  const labeled = total - counts.unlabeled;
  const pct = (n: number) => (labeled ? Math.round((n / labeled) * 100) : 0);

  return {
    total,
    ...counts,
    positivePct: pct(counts.positive),
    negativePct: pct(counts.negative),
    neutralPct: pct(counts.neutral),
  };
}
