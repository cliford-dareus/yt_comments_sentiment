import { getContext } from "@/lib/context";
import { db } from "@/lib/db";
import { $chats, $message, $sentiment } from "@/lib/db/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenerativeAIStream, Message, StreamingTextResponse } from "ai";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

const buildGoogleGenAIPrompt = (messages: Message[]) => ({
  contents: messages
    .filter(
      (message) => message.role === "user" || message.role === "assistant",
    )
    .map((message) => ({
      role: message.role === "user" ? "user" : "model",
      parts: [{ text: message.content }],
    })),
});

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
    const lastMessage = messages[messages.length - 1];

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
    const context = await getContext(lastMessage.content, file_name);

    const systemText = `You are a helpful assistant that helps creators understand their YouTube audience through comment analysis.

Traits: expert knowledge, helpful, concise, and actionable. Never invent comments that are not present in the provided context.

${sentimentSummary ? `SENTIMENT ANALYSIS SUMMARY\n${sentimentSummary}\n` : ""}
${context ? `RELEVANT COMMENTS (retrieved)\n${context}\n` : ""}

Guidelines:
- Prefer evidence from the sentiment summary and the retrieved comments.
- If the context does not contain enough information, say so clearly instead of guessing.
- Keep answers focused and useful for a content creator.`;

    const geminiStream = await genAI
      .getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemText,
      })
      .generateContentStream(buildGoogleGenAIPrompt(messages));

    const stream = GoogleGenerativeAIStream(geminiStream, {
      async onCompletion(completion) {
        // Persist the full assistant reply once streaming finishes
        if (completion?.trim()) {
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
        }
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
