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
  if (!user) {
    return { error: "Unauthorized" };
  }

  if (!chatId || !commentId) {
    return { error: "chatId and commentId are required" };
  }

  const chatRows = await db
    .select()
    .from($chats)
    .where(and(eq($chats.id, chatId), eq($chats.userId, user.id)))
    .limit(1);

  if (!chatRows.length) {
    return { error: "Chat not found" };
  }

  const commentRows = await db
    .select()
    .from($comments)
    .where(and(eq($comments.id, commentId), eq($comments.chatId, chatId)))
    .limit(1);

  if (!commentRows.length) {
    return { error: "Comment not found" };
  }

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
      generationConfig: { temperature: 0.7 },
    });

    const prompt = `You write YouTube comment replies for the video creator.

Tone: ${selectedTone}
Tone guidance: ${TONE_GUIDANCE[selectedTone]}

Viewer comment:
- Author: ${comment.authorDisplayName ?? "Viewer"}
- Sentiment label: ${comment.sentimentLabel ?? "unknown"}
- Text: """${comment.text}"""

${overview ? `Channel comment-section overview (context only):\n${overview}\n` : ""}

Write ONE reply the creator can post as-is under that comment.

Rules:
- Address the substance of THIS comment; do not invent facts about the video.
- Keep it short (1–4 sentences). YouTube-native, not corporate essay.
- No hashtags unless the viewer used them.
- No quotation marks around the whole reply.
- If the comment is hostile or trolling, stay calm and brief; do not escalate.
- If it's a question, answer helpfully or say you'll cover it in a future video when appropriate.
- If it's praise, thank them specifically without being generic.

Return ONLY the reply text.`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();

    if (!reply) {
      return { error: "Model returned an empty reply" };
    }

    return {
      reply,
      tone: selectedTone,
      commentId,
    };
  } catch (err) {
    console.error("draftReplyToComment error:", err);
    return { error: "Failed to draft reply" };
  }
}
