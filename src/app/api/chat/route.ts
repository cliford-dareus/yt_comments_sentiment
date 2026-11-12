import { getContext } from "@/lib/context";
import { db } from "@/lib/db";
import { $chats, $message, $sentiment } from "@/lib/db/schema";
import { streamChat, streamToResponse, type ChatTurn } from "@/lib/gemini";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type IncomingMessage = {
  role: string;
  content: string;
};

function toChatTurns(messages: IncomingMessage[]): ChatTurn[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("model" as const),
      text: m.content ?? "",
    }));
}

export async function POST(req: Request) {
  try {
    const { messages, chatId } = await req.json();

    if (!chatId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "chatId and messages are required" },
        { status: 400 },
      );
    }

    const _chats = await db.select().from($chats).where(eq($chats.id, chatId));

    if (_chats.length !== 1) {
      return NextResponse.json({ error: "chat not found" }, { status: 404 });
    }

    const file_name = _chats[0].fileName ?? "";
    const lastMessage = messages[messages.length - 1] as IncomingMessage;

    // Persist the latest user message
    if (lastMessage?.role === "user" && lastMessage.content) {
      await db.insert($message).values({
        id: crypto.randomUUID(),
        chatId,
        content: lastMessage.content,
        role: "user",
      });
    }

    // Load stored sentiment summary (if any)
    const sentimentRows = await db
      .select()
      .from($sentiment)
      .where(eq($sentiment.chatId, chatId))
      .limit(1);

    const sentimentSummary = sentimentRows[0]?.content?.trim() ?? "";

    // RAG context from comment embeddings
    const context = await getContext(lastMessage.content ?? "", file_name);

    const systemInstruction = `You are a helpful assistant that helps creators understand their YouTube audience through comment analysis.

Traits: expert knowledge, helpful, concise, and actionable. Never invent comments that are not present in the provided context.

${sentimentSummary ? `SENTIMENT ANALYSIS SUMMARY\n${sentimentSummary}\n` : ""}
${context ? `RELEVANT COMMENTS (retrieved)\n${context}\n` : ""}

Guidelines:
- Prefer evidence from the sentiment summary and the retrieved comments.
- If the context does not contain enough information, say so clearly instead of guessing.
- Keep answers focused and useful for a content creator.`;

    const turns = toChatTurns(messages as IncomingMessage[]);

    const generator = streamChat({
      messages: turns,
      systemInstruction,
      temperature: 0.3,
    });

    return streamToResponse(generator, {
      onComplete: async (completion) => {
        if (!completion?.trim()) return;
        try {
          await db.insert($message).values({
            id: crypto.randomUUID(),
            chatId,
            content: completion,
            role: "assistant",
          });
        } catch (err) {
          console.error("Failed to save assistant message:", err);
        }
      },
    });
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
