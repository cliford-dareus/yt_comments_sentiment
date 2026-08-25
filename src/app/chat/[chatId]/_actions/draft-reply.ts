"use server";

import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { $chats, $comments, $sentiment } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export type ReplyTone =
  | "friendly"
  | "professional"
  | "playful"
  | "apologetic";

const TONE_GUIDANCE: Record<ReplyTone, string> = {
  friendly:
    "Warm, appreciative, conversational. Like a creator talking to a regular viewer.",
  professional:
    "Clear, respectful, polished. Suitable for brand/channel that wants a serious tone.",
  playful:
    "Light, witty, human — still kind. Avoid forced memes or cringe.",
  apologetic:
    "Empathetic and accountable when the comment is critical. Don't over-apologize or admit false claims.",
};

function parseJsonFromModel(text: string): unknown {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

async function assertChatOwner(chatId: string, userId: string) {
  const chatRows = await db
    .select()
    .from($chats)
    .where(and(eq($chats.id, chatId), eq($chats.userId, userId)))
    .limit(1);
  return chatRows[0] ?? null;
}

/**
 * Generate 3 reply variants for a single comment.
 */
export async function draftReplyToComment({
  chatId,
  commentId,
  tone = "friendly",
}: {
  chatId: string;
  commentId: string;
  tone?: ReplyTone;
}) {
  const user = await getUser();
  if (!user) return { error: "Unauthorized" };

  if (!chatId || !commentId) {
    return { error: "chatId and commentId are required" };
  }

  const chat = await assertChatOwner(chatId, user.id);
  if (!chat) return { error: "Chat not found" };

  const commentRows = await db
    .select()
    .from($comments)
    .where(and(eq($comments.id, commentId), eq($comments.chatId, chatId)))
    .limit(1);

  if (!commentRows.length) return { error: "Comment not found" };

  const comment = commentRows[0];

  const sentimentRows = await db
    .select({ content: $sentiment.content })
    .from($sentiment)
    .where(eq($sentiment.chatId, chatId))
    .limit(1);

  const overview = sentimentRows[0]?.content?.slice(0, 1200) ?? "";
  const selectedTone: ReplyTone =
    tone in TONE_GUIDANCE ? tone : "friendly";

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { temperature: 0.85 },
    });

    const prompt = `You write YouTube comment replies for the video creator.

Tone: ${selectedTone}
Tone guidance: ${TONE_GUIDANCE[selectedTone]}

Viewer comment:
- Author: ${comment.authorDisplayName ?? "Viewer"}
- Sentiment label: ${comment.sentimentLabel ?? "unknown"}
- Text: """${comment.text}"""

${overview ? `Comment-section overview (context only):\n${overview}\n` : ""}

Return ONLY valid JSON (no markdown) as an array of exactly 3 distinct reply strings:
["reply variant 1", "reply variant 2", "reply variant 3"]

Rules for each reply:
- Address THIS comment; do not invent video facts.
- 1–4 sentences, YouTube-native.
- No surrounding quotation marks on the whole reply.
- Variants must differ in wording/angle (not near-duplicates).
- Hostile/troll → calm and brief. Question → helpful. Praise → specific thanks.`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    let variants: string[] = [];
    try {
      const parsed = parseJsonFromModel(raw);
      if (Array.isArray(parsed)) {
        variants = parsed
          .map((v) => String(v).trim())
          .filter(Boolean)
          .slice(0, 3);
      }
    } catch {
      // Fallback: treat whole response as one draft
      const single = raw.trim();
      if (single) variants = [single];
    }

    if (!variants.length) {
      return { error: "Model returned empty drafts" };
    }

    // Pad if model returned fewer than 3
    while (variants.length < 3 && variants[0]) {
      variants.push(variants[0]);
    }

    return {
      variants,
      reply: variants[0], // backwards compatible
      tone: selectedTone,
      commentId,
    };
  } catch (err) {
    console.error("draftReplyToComment error:", err);
    return { error: "Failed to draft reply" };
  }
}

/** Persist the creator's chosen/edited reply on the comment row. */
export async function saveReplyDraft({
  chatId,
  commentId,
  draft,
}: {
  chatId: string;
  commentId: string;
  draft: string;
}) {
  const user = await getUser();
  if (!user) return { error: "Unauthorized" };

  const chat = await assertChatOwner(chatId, user.id);
  if (!chat) return { error: "Chat not found" };

  const text = draft.trim();
  if (!text) return { error: "Draft cannot be empty" };

  const updated = await db
    .update($comments)
    .set({ replyDraft: text })
    .where(and(eq($comments.id, commentId), eq($comments.chatId, chatId)))
    .returning({ id: $comments.id });

  if (!updated.length) return { error: "Comment not found" };

  return { ok: true };
}

/** Draft a pinned comment / community-post style message from insights. */
export async function draftCommunityPost({
  chatId,
  tone = "friendly",
}: {
  chatId: string;
  tone?: ReplyTone;
}) {
  const user = await getUser();
  if (!user) return { error: "Unauthorized" };

  const chat = await assertChatOwner(chatId, user.id);
  if (!chat) return { error: "Chat not found" };

  const sentimentRows = await db
    .select({ content: $sentiment.content })
    .from($sentiment)
    .where(eq($sentiment.chatId, chatId))
    .limit(1);

  const overview = sentimentRows[0]?.content?.trim();
  if (!overview) {
    return { error: "No insights available yet for this project" };
  }

  const selectedTone: ReplyTone =
    tone in TONE_GUIDANCE ? tone : "friendly";

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { temperature: 0.7 },
    });

    const prompt = `You write a pinned YouTube comment or community-post reply from the creator.

Tone: ${selectedTone} — ${TONE_GUIDANCE[selectedTone]}

Insights from the comment section:
"""
${overview.slice(0, 2000)}
"""

Write ONE short post (3–6 sentences) the creator can pin or post to the community tab.
Acknowledge what viewers liked, address the main criticism constructively if any, and invite more feedback.
No hashtag spam. Return ONLY the post text.`;

    const result = await model.generateContent(prompt);
    const post = result.response.text().trim();

    if (!post) return { error: "Empty community post draft" };

    return { post, tone: selectedTone };
  } catch (err) {
    console.error("draftCommunityPost error:", err);
    return { error: "Failed to draft community post" };
  }
}
