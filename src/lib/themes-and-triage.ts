import { db } from "@/lib/db";
import { $comments, $themeClusters } from "@/lib/db/schema";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { generateText, withRetry } from "@/lib/gemini";
import { THEME_CATALOG } from "@/lib/theme-catalog";

export { THEME_CATALOG };

const BATCH = 25;

function parseJson(text: string): unknown {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("JSON parse failed");
  }
}

function normalizeThemeKey(raw: unknown): string {
  const key = String(raw ?? "other")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  if (THEME_CATALOG[key]) return key;
  if (/audio|mic|sound|volume/.test(key)) return "audio";
  if (/video|visual|camera|resolution/.test(key)) return "video_quality";
  if (/pace|length|long|short|drag/.test(key)) return "pacing";
  if (/thumb|title|clickbait/.test(key)) return "thumbnail_title";
  if (/sponsor|ad|promo|shill/.test(key)) return "sponsorship";
  if (/fact|wrong|mistake|accuracy/.test(key)) return "accuracy";
  if (/rude|attitude|tone|arrogant/.test(key)) return "tone_attitude";
  if (/edit|cut|transition/.test(key)) return "editing";
  if (/caption|subtitle|access/.test(key)) return "accessibility";
  if (/drama|controvers|cancel/.test(key)) return "controversy";
  if (/question|ask|how|why/.test(key)) return "question";
  if (/request|please make|next video/.test(key)) return "request";
  if (/praise|love|great|amazing/.test(key)) return "praise_content";
  return "other";
}

export async function buildThemeClustersForChat(chatId: string) {
  const rows = await db
    .select({
      id: $comments.id,
      text: $comments.text,
      label: $comments.sentimentLabel,
      likes: $comments.likeCount,
      themeKey: $comments.themeKey,
    })
    .from($comments)
    .where(eq($comments.chatId, chatId));

  const candidates = rows.filter((r) => {
    if (r.themeKey) return false;
    if (r.label === "negative") return true;
    if (
      r.label === "neutral" &&
      /\?|please|can you|could you|how do|why did/i.test(r.text)
    ) {
      return true;
    }
    if (r.label === "positive" && (r.likes ?? 0) >= 5) return true;
    return false;
  });

  const toCluster = candidates
    .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
    .slice(0, 120);

  for (let i = 0; i < toCluster.length; i += BATCH) {
    const batch = toCluster.slice(i, i + BATCH);
    const payload = batch.map((c) => ({
      id: c.id,
      text: c.text.slice(0, 320),
      sentiment: c.label,
    }));

    const keys = Object.keys(THEME_CATALOG).join(", ");
    let assigned: Array<{ id: string; theme: string }> = [];

    try {
      const raw = await withRetry(
        () =>
          generateText({
            temperature: 0.1,
            json: true,
            maxOutputTokens: 4096,
            prompt: `Assign each YouTube comment a theme_key for creator actionability.
Allowed theme_key values: ${keys}
Return JSON array only: [{"id":"...","theme":"audio"}]
Rules:
- Prefer specific issue themes for criticism
- Use "question" for genuine questions
- Use "request" for future content asks
- Use praise_* for clear compliments
- Use "other" only if nothing fits
Comments:
${JSON.stringify(payload)}`,
          }),
        { label: "themeBatch", retries: 2 },
      );

      const parsed = parseJson(raw);
      if (Array.isArray(parsed)) {
        assigned = parsed.map((row: Record<string, unknown>) => ({
          id: String(row.id ?? ""),
          theme: normalizeThemeKey(row.theme ?? row.theme_key),
        }));
      }
    } catch (err) {
      console.error("theme batch failed", err);
      assigned = batch.map((c) => ({
        id: c.id,
        theme: c.label === "negative" ? "other" : "question",
      }));
    }

    for (const a of assigned) {
      if (!a.id) continue;
      await db
        .update($comments)
        .set({ themeKey: a.theme })
        .where(eq($comments.id, a.id));
    }
  }

  const themed = await db
    .select({
      id: $comments.id,
      themeKey: $comments.themeKey,
      likes: $comments.likeCount,
      text: $comments.text,
      label: $comments.sentimentLabel,
    })
    .from($comments)
    .where(and(eq($comments.chatId, chatId), isNotNull($comments.themeKey)));

  const byTheme = new Map<
    string,
    { ids: string[]; likes: number; texts: string[] }
  >();

  for (const r of themed) {
    const key = r.themeKey!;
    const bucket = byTheme.get(key) ?? { ids: [], likes: 0, texts: [] };
    bucket.ids.push(r.id);
    bucket.likes += r.likes ?? 0;
    if (bucket.texts.length < 3) bucket.texts.push(r.text.slice(0, 160));
    byTheme.set(key, bucket);
  }

  await db.delete($themeClusters).where(eq($themeClusters.chatId, chatId));

  for (const [themeKey, data] of byTheme) {
    const meta = THEME_CATALOG[themeKey] ?? {
      label: themeKey,
      polarity: "mixed" as const,
    };

    let summary: string | null = null;
    if (data.texts.length && meta.polarity === "negative") {
      try {
        summary = await withRetry(
          () =>
            generateText({
              temperature: 0.2,
              maxOutputTokens: 120,
              prompt: `In one sentence, summarize this comment theme for a YouTube creator (what to fix or address). Theme: ${meta.label}. Examples: ${JSON.stringify(data.texts)}`,
            }),
          { label: "themeSummary", retries: 1 },
        );
      } catch {
        summary = null;
      }
    }

    await db.insert($themeClusters).values({
      id: crypto.randomUUID(),
      chatId,
      themeKey,
      label: meta.label,
      polarity: meta.polarity,
      commentCount: data.ids.length,
      likeWeight: data.likes,
      summary,
      exampleCommentIds: JSON.stringify(data.ids.slice(0, 5)),
    });
  }

  return { themes: byTheme.size, commentsTagged: themed.length };
}

function looksLikeQuestion(text: string) {
  return /\?|^(how|what|why|when|where|who|can|could|would|is|are|do|does)\b/i.test(
    text.trim(),
  );
}

export async function buildTriageInbox(chatId: string) {
  const rows = await db
    .select({
      id: $comments.id,
      text: $comments.text,
      label: $comments.sentimentLabel,
      likes: $comments.likeCount,
      themeKey: $comments.themeKey,
      replyDraft: $comments.replyDraft,
      triageStatus: $comments.triageStatus,
    })
    .from($comments)
    .where(eq($comments.chatId, chatId));

  let queued = 0;

  for (const r of rows) {
    if (r.triageStatus === "done" || r.triageStatus === "skipped") {
      continue;
    }

    const likes = r.likes ?? 0;
    const isNeg = r.label === "negative";
    const isQ = looksLikeQuestion(r.text) || r.themeKey === "question";
    const hasDraft = Boolean(r.replyDraft?.trim());

    let priority = 0;
    let reason = "";

    if (isNeg && likes >= 3) {
      priority = 80 + Math.min(20, likes);
      reason = `High-visibility criticism (${likes} likes)`;
    } else if (isNeg) {
      priority = 50 + Math.min(15, likes);
      reason = "Criticism worth a glance";
    } else if (isQ && likes >= 2) {
      priority = 70 + Math.min(15, likes);
      reason = `Popular question (${likes} likes)`;
    } else if (isQ) {
      priority = 45;
      reason = "Answerable question";
    } else if (r.label === "positive" && likes >= 20) {
      priority = 35;
      reason = "Superfan / high-engagement praise — good to thank";
    } else {
      if (!r.triageStatus) {
        await db
          .update($comments)
          .set({
            triageStatus: null,
            triagePriority: null,
            triageReason: null,
          })
          .where(eq($comments.id, r.id));
      }
      continue;
    }

    if (
      r.themeKey &&
      ["audio", "video_quality", "pacing", "thumbnail_title", "editing"].includes(
        r.themeKey,
      )
    ) {
      priority += 8;
      reason += ` · theme: ${THEME_CATALOG[r.themeKey]?.label ?? r.themeKey}`;
    }

    const status = hasDraft ? ("drafted" as const) : ("open" as const);

    await db
      .update($comments)
      .set({
        triageStatus: status,
        triagePriority: Math.min(100, priority),
        triageReason: reason,
      })
      .where(eq($comments.id, r.id));

    queued++;
  }

  return { queued };
}

export async function enrichThemesAndTriage(chatId: string) {
  const themes = await buildThemeClustersForChat(chatId);
  const triage = await buildTriageInbox(chatId);
  return { ...themes, ...triage };
}

export async function getThemeClusters(chatId: string) {
  return db
    .select()
    .from($themeClusters)
    .where(eq($themeClusters.chatId, chatId))
    .orderBy(desc($themeClusters.likeWeight));
}

export async function getTriageInbox(
  chatId: string,
  opts?: { status?: "open" | "drafted" | "done" | "skipped" | "all" },
) {
  const status = opts?.status ?? "all";

  const rows = await db
    .select({
      id: $comments.id,
      text: $comments.text,
      authorDisplayName: $comments.authorDisplayName,
      likeCount: $comments.likeCount,
      sentimentLabel: $comments.sentimentLabel,
      themeKey: $comments.themeKey,
      replyDraft: $comments.replyDraft,
      triageStatus: $comments.triageStatus,
      triagePriority: $comments.triagePriority,
      triageReason: $comments.triageReason,
    })
    .from($comments)
    .where(
      and(
        eq($comments.chatId, chatId),
        isNotNull($comments.triageStatus),
        status === "all" ? sql`true` : eq($comments.triageStatus, status),
      ),
    )
    .orderBy(desc($comments.triagePriority));

  return rows;
}

export async function setTriageStatus(params: {
  chatId: string;
  commentId: string;
  status: "open" | "drafted" | "done" | "skipped";
}) {
  await db
    .update($comments)
    .set({ triageStatus: params.status })
    .where(
      and(
        eq($comments.id, params.commentId),
        eq($comments.chatId, params.chatId),
      ),
    );
}
